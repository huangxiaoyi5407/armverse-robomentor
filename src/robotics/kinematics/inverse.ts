import { geometricJacobian, type Matrix6 } from "@/robotics/jacobian";
import type { JointVector, Pose, Quaternion, RobotModel } from "@/robotics/types";
import { assertFiniteVector } from "@/robotics/types";
import { forwardKinematics } from "./forward";

const SIZE = 6;
const PIVOT_EPSILON = 1e-14;
const QUATERNION_EPSILON = 1e-15;
// Below these scales, double-precision updates or requested residuals are not
// meaningful for a metre/radian educational UR5 simulation.
const MIN_POSITION_TOLERANCE = 1e-9;
const MIN_ORIENTATION_TOLERANCE = 1e-9;
const MIN_DAMPING = 1e-6;
const MIN_STEP_SIZE = 1e-6;

export interface IKOptions {
  readonly maxIterations: number;
  readonly positionTolerance: number;
  readonly orientationTolerance: number;
  readonly damping: number;
  readonly stepSize: number;
  readonly maxHistoryEntries: number;
}

export type IKFailureCode =
  | "MAX_ITERATIONS"
  | "STALLED_AT_LIMITS"
  | "NUMERIC_STALL"
  | "NUMERIC_FAILURE";

export interface IKHistoryEntry {
  readonly iteration: number;
  readonly joints: JointVector;
  readonly positionError: number;
  readonly orientationError: number;
  readonly stepNorm: number;
}

export type IKResult = Readonly<{
  status: "converged";
  joints: JointVector;
  iterations: number;
  positionError: number;
  orientationError: number;
  history: readonly IKHistoryEntry[];
  failureCode: null;
  failureReason: null;
} | {
  status: "failed";
  joints: JointVector;
  iterations: number;
  positionError: number;
  orientationError: number;
  history: readonly IKHistoryEntry[];
  failureCode: IKFailureCode;
  failureReason: string;
}>;

const DEFAULT_OPTIONS: IKOptions = Object.freeze({
  maxIterations: 200,
  positionTolerance: 1e-4,
  orientationTolerance: 1e-3,
  damping: 0.05,
  stepSize: 0.7,
  maxHistoryEntries: 100,
});

function normalizeQuaternion(value: unknown): Quaternion {
  assertFiniteVector(value, 4);
  const magnitude = Math.hypot(...value);
  if (!Number.isFinite(magnitude) || magnitude <= QUATERNION_EPSILON) {
    throw new RangeError("Target orientation must be a non-zero finite quaternion.");
  }
  const normalized = value.map((component) => component / magnitude);
  const signProbe = Math.abs(normalized[3]) > 1e-12
    ? normalized[3]
    : (normalized.slice(0, 3).find((component) => Math.abs(component) > 1e-12) ?? 1);
  const sign = signProbe < 0 ? -1 : 1;
  return Object.freeze(normalized.map((component) => component * sign)) as unknown as Quaternion;
}

function validateTarget(target: unknown): Pose {
  if (typeof target !== "object" || target === null) {
    throw new TypeError("IK target must be a pose object.");
  }
  const candidate = target as Partial<Pose>;
  assertFiniteVector(candidate.position, 3);
  const orientation = normalizeQuaternion(candidate.orientation);
  return Object.freeze({
    position: Object.freeze([...candidate.position]) as Pose["position"],
    orientation,
  });
}

function validateOptions(options: Partial<IKOptions> | undefined): IKOptions {
  if (options !== undefined && (typeof options !== "object" || options === null)) {
    throw new TypeError("IK options must be an object.");
  }
  const merged = { ...DEFAULT_OPTIONS, ...options };
  const boundedFinite = (name: keyof IKOptions, lower: number, upper: number): void => {
    const value = merged[name];
    if (typeof value !== "number" || !Number.isFinite(value) || value < lower || value > upper) {
      throw new RangeError(`IK option ${name} must be finite within [${lower}, ${upper}].`);
    }
  };
  boundedFinite("positionTolerance", MIN_POSITION_TOLERANCE, 0.1);
  boundedFinite("orientationTolerance", MIN_ORIENTATION_TOLERANCE, Math.PI);
  boundedFinite("damping", MIN_DAMPING, 10);
  boundedFinite("stepSize", MIN_STEP_SIZE, 1);
  boundedFinite("maxIterations", 1, 10_000);
  boundedFinite("maxHistoryEntries", 1, 1_000);
  if (!Number.isInteger(merged.maxIterations) || !Number.isInteger(merged.maxHistoryEntries)) {
    throw new RangeError("IK iteration and history limits must be integers.");
  }
  return Object.freeze(merged);
}

function quaternionMultiply(left: Quaternion, right: Quaternion): Quaternion {
  const [lx, ly, lz, lw] = left;
  const [rx, ry, rz, rw] = right;
  return [
    lw * rx + lx * rw + ly * rz - lz * ry,
    lw * ry - lx * rz + ly * rw + lz * rx,
    lw * rz + lx * ry - ly * rx + lz * rw,
    lw * rw - lx * rx - ly * ry - lz * rz,
  ];
}

/** Base-frame rotation vector taking current orientation to target orientation. */
function orientationError(target: Quaternion, current: Quaternion): readonly [number, number, number] {
  const relative = normalizeQuaternion(quaternionMultiply(target, [
    -current[0], -current[1], -current[2], current[3],
  ]));
  const vectorNorm = Math.hypot(relative[0], relative[1], relative[2]);
  if (vectorNorm < 1e-12) {
    // atan2 form is stable near zero; 2*v is its first-order limit.
    return [2 * relative[0], 2 * relative[1], 2 * relative[2]];
  }
  const angle = 2 * Math.atan2(vectorNorm, Math.max(0, relative[3]));
  const scale = angle / vectorNorm;
  return [relative[0] * scale, relative[1] * scale, relative[2] * scale];
}

function solveLinear(matrix: readonly (readonly number[])[], vector: readonly number[]): number[] | null {
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < SIZE; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < SIZE; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (!Number.isFinite(augmented[pivot][column]) || Math.abs(augmented[pivot][column]) < PIVOT_EPSILON) {
      return null;
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    for (let index = column; index <= SIZE; index += 1) augmented[column][index] /= divisor;
    for (let row = 0; row < SIZE; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let index = column; index <= SIZE; index += 1) {
        augmented[row][index] -= factor * augmented[column][index];
      }
    }
  }
  const solution = augmented.map((row) => row[SIZE]);
  return solution.every(Number.isFinite) ? solution : null;
}

function freezeJoints(values: readonly number[]): JointVector {
  return Object.freeze([...values]) as unknown as JointVector;
}

function freezeEntry(
  iteration: number,
  joints: readonly number[],
  positionError: number,
  orientationErrorValue: number,
  stepNorm: number,
): IKHistoryEntry {
  return Object.freeze({
    iteration,
    joints: freezeJoints(joints),
    positionError,
    orientationError: orientationErrorValue,
    stepNorm,
  });
}

function appendBounded(history: IKHistoryEntry[], entry: IKHistoryEntry, limit: number): void {
  if (history.length < limit) history.push(entry);
  else history[limit - 1] = entry;
}

function finish(
  status: "converged" | "failed",
  joints: readonly number[],
  iterations: number,
  positionError: number,
  orientationErrorValue: number,
  history: IKHistoryEntry[],
  failureCode: IKFailureCode | null,
  failureReason: string | null,
): IKResult {
  return Object.freeze({
    status,
    joints: freezeJoints(joints),
    iterations,
    positionError,
    orientationError: orientationErrorValue,
    history: Object.freeze([...history]),
    failureCode,
    failureReason,
  }) as IKResult;
}

/**
 * Deterministic bounded damped-least-squares IK.
 * Convergence requires both Cartesian position and shortest-rotation errors to
 * satisfy their respective tolerances. Malformed API inputs throw; numerical
 * non-convergence returns an immutable diagnostic result.
 */
export function solveInverseKinematics(
  model: RobotModel,
  target: Pose,
  initial: JointVector,
  options?: Partial<IKOptions>,
): IKResult {
  const safeTarget = validateTarget(target);
  const settings = validateOptions(options);
  // Shared FK boundary validates the model, vector length, finiteness and limits.
  forwardKinematics(model, initial);
  let joints = [...initial];
  const history: IKHistoryEntry[] = [];
  let lastPositionError = Number.POSITIVE_INFINITY;
  let lastOrientationError = Number.POSITIVE_INFINITY;

  for (let iteration = 0; iteration <= settings.maxIterations; iteration += 1) {
    let current: Pose;
    let jacobian: Matrix6;
    try {
      current = forwardKinematics(model, joints as unknown as JointVector).endEffector;
      const positionVector = safeTarget.position.map((value, axis) => value - current.position[axis]);
      const rotationVector = orientationError(safeTarget.orientation, current.orientation);
      lastPositionError = Math.hypot(...positionVector);
      lastOrientationError = Math.hypot(...rotationVector);
      if (![lastPositionError, lastOrientationError].every(Number.isFinite)) throw new RangeError();

      if (
        lastPositionError <= settings.positionTolerance &&
        lastOrientationError <= settings.orientationTolerance
      ) {
        appendBounded(history, freezeEntry(
          iteration, joints, lastPositionError, lastOrientationError, 0,
        ), settings.maxHistoryEntries);
        return finish(
          "converged", joints, iteration, lastPositionError, lastOrientationError,
          history, null, null,
        );
      }
      if (iteration === settings.maxIterations) {
        appendBounded(history, freezeEntry(
          iteration, joints, lastPositionError, lastOrientationError, 0,
        ), settings.maxHistoryEntries);
        break;
      }
      jacobian = geometricJacobian(model, joints as unknown as JointVector);

      const error = [...positionVector, ...rotationVector];
      const normal = Array.from({ length: SIZE }, (_, row) =>
        Array.from({ length: SIZE }, (_, column) => {
          let value = row === column ? settings.damping * settings.damping : 0;
          for (let inner = 0; inner < SIZE; inner += 1) {
            value += jacobian[row][inner] * jacobian[column][inner];
          }
          return value;
        }));
      const auxiliary = solveLinear(normal, error);
      if (auxiliary === null) {
        return finish(
          "failed", joints, iteration, lastPositionError, lastOrientationError,
          history, "NUMERIC_FAILURE", "The damped linear system could not be solved finitely.",
        );
      }
      const delta = Array.from({ length: SIZE }, (_, joint) => {
        let value = 0;
        for (let row = 0; row < SIZE; row += 1) value += jacobian[row][joint] * auxiliary[row];
        return settings.stepSize * value;
      });
      if (!delta.every(Number.isFinite)) throw new RangeError();
      const proposedStepNorm = Math.hypot(...delta);
      const candidate = delta.map((value, joint) => Math.min(
        model.jointLimits[joint].max,
        Math.max(model.jointLimits[joint].min, joints[joint] + value),
      ));
      const actualStep = candidate.map((value, joint) => value - joints[joint]);
      const stepNorm = Math.hypot(...actualStep);
      appendBounded(history, freezeEntry(
        iteration, joints, lastPositionError, lastOrientationError, stepNorm,
      ), settings.maxHistoryEntries);
      if (stepNorm <= 1e-14) {
        const clampingRemovedMotion = proposedStepNorm > 1e-14;
        return finish(
          "failed", joints, iteration, lastPositionError, lastOrientationError,
          history,
          clampingRemovedMotion ? "STALLED_AT_LIMITS" : "NUMERIC_STALL",
          clampingRemovedMotion
            ? "Joint limits prevented the proposed finite update."
            : "The unconstrained numerical update was below useful floating-point resolution.",
        );
      }
      joints = candidate;
    } catch (error) {
      if (iteration === 0) throw error;
      return finish(
        "failed", joints, iteration, lastPositionError, lastOrientationError,
        history, "NUMERIC_FAILURE", "IK arithmetic left the finite numeric domain.",
      );
    }
  }

  return finish(
    "failed", joints, settings.maxIterations, lastPositionError, lastOrientationError,
    history, "MAX_ITERATIONS", "The solver exhausted its deterministic iteration budget.",
  );
}

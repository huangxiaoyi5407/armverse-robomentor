import { forwardKinematics, solveInverseKinematics, type IKOptions } from "@/robotics/kinematics";
import type { JointVector, Pose, Quaternion, RobotModel } from "@/robotics/types";
import { assertFiniteVector } from "@/robotics/types";
import { UR5_MODEL } from "@/robotics/ur5-model";

export interface TrajectorySample {
  readonly time: number;
  readonly joints: JointVector;
  readonly pose: Pose;
  readonly velocities: JointVector;
}

export interface Trajectory {
  readonly kind: "joint" | "cartesian";
  readonly duration: number;
  readonly complete: true;
  readonly samples: readonly TrajectorySample[];
}

export interface JointTrajectoryOptions {
  readonly duration: number;
  readonly sampleCount: number;
  readonly mode: "cubic" | "quintic";
}

export interface CartesianTrajectoryOptions {
  readonly duration: number;
  readonly sampleCount: number;
  readonly ik?: Partial<IKOptions>;
}

export type TrajectoryResult = Readonly<
  | { status: "planned"; trajectory: Trajectory }
  | {
    status: "failed";
    failureCode: "IK_FAILED";
    failureReason: string;
    failedSample: number;
    partialSamples: readonly TrajectorySample[];
  }
>;

function validateTiming(duration: number, sampleCount: number): void {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new RangeError("Trajectory duration must be a positive finite number.");
  }
  if (!Number.isInteger(sampleCount) || sampleCount < 2 || sampleCount > 1_001) {
    throw new RangeError("Trajectory sampleCount must be an integer in [2, 1001].");
  }
}

function validateJoints(model: RobotModel, value: unknown): asserts value is JointVector {
  assertFiniteVector(value, 6);
  for (let index = 0; index < 6; index += 1) {
    const limit = model.jointLimits[index];
    if (value[index] < limit.min || value[index] > limit.max) {
      throw new RangeError(`Joint ${index + 1} is outside the model limits.`);
    }
  }
}

function freezeJoints(values: readonly number[]): JointVector {
  return Object.freeze([...values]) as unknown as JointVector;
}

function freezePose(pose: Pose): Pose {
  return Object.freeze({
    position: Object.freeze([...pose.position]) as Pose["position"],
    orientation: Object.freeze([...pose.orientation]) as Quaternion,
  });
}

function freezeSample(
  time: number,
  joints: readonly number[],
  pose: Pose,
  velocities: readonly number[],
): TrajectorySample {
  return Object.freeze({
    time,
    joints: freezeJoints(joints),
    pose: freezePose(pose),
    velocities: freezeJoints(velocities),
  });
}

function freezeTrajectory(kind: Trajectory["kind"], duration: number, samples: TrajectorySample[]): Trajectory {
  return Object.freeze({ kind, duration, complete: true, samples: Object.freeze(samples) });
}

function interpolation(mode: JointTrajectoryOptions["mode"], u: number): [number, number] {
  if (mode === "cubic") {
    return [3 * u ** 2 - 2 * u ** 3, 6 * u - 6 * u ** 2];
  }
  if (mode === "quintic") {
    return [10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5, 30 * u ** 2 - 60 * u ** 3 + 30 * u ** 4];
  }
  throw new TypeError("Trajectory mode must be cubic or quintic.");
}

export function planJointTrajectory(
  start: JointVector,
  end: JointVector,
  options: JointTrajectoryOptions,
): Trajectory {
  validateJoints(UR5_MODEL, start);
  validateJoints(UR5_MODEL, end);
  if (typeof options !== "object" || options === null) throw new TypeError("Options are required.");
  validateTiming(options.duration, options.sampleCount);
  interpolation(options.mode, 0);

  const samples: TrajectorySample[] = [];
  for (let index = 0; index < options.sampleCount; index += 1) {
    const u = index / (options.sampleCount - 1);
    const [positionScale, derivativeScale] = interpolation(options.mode, u);
    const joints = start.map((value, joint) =>
      value + (end[joint] - value) * positionScale) as number[];
    const velocities = start.map((value, joint) =>
      (end[joint] - value) * derivativeScale / options.duration) as number[];
    // Preserve exact public endpoints and exact zero endpoint velocity.
    const exactJoints = index === 0 ? start : index === options.sampleCount - 1 ? end : joints;
    const exactVelocities = index === 0 || index === options.sampleCount - 1
      ? [0, 0, 0, 0, 0, 0]
      : velocities;
    samples.push(freezeSample(
      options.duration * u,
      exactJoints,
      forwardKinematics(UR5_MODEL, exactJoints as JointVector).endEffector,
      exactVelocities,
    ));
  }
  return freezeTrajectory("joint", options.duration, samples);
}

function normalizeQuaternion(value: unknown): Quaternion {
  assertFiniteVector(value, 4);
  const length = Math.hypot(...value);
  if (!Number.isFinite(length) || length < 1e-15) throw new RangeError("Quaternion must be non-zero.");
  return value.map((entry) => entry / length) as unknown as Quaternion;
}

function slerpShortest(start: Quaternion, target: Quaternion, u: number): Quaternion {
  let end = [...target];
  let dot = start.reduce((sum, value, index) => sum + value * end[index], 0);
  if (dot < 0) {
    end = end.map((value) => -value);
    dot = -dot;
  }
  dot = Math.min(1, Math.max(-1, dot));
  if (dot > 0.9995) {
    return normalizeQuaternion(start.map((value, index) => value + u * (end[index] - value)));
  }
  const theta = Math.acos(dot);
  const denominator = Math.sin(theta);
  const left = Math.sin((1 - u) * theta) / denominator;
  const right = Math.sin(u * theta) / denominator;
  return normalizeQuaternion(start.map((value, index) => left * value + right * end[index]));
}

function validatePose(target: unknown): asserts target is Pose {
  if (typeof target !== "object" || target === null) throw new TypeError("Target pose is required.");
  const candidate = target as Partial<Pose>;
  assertFiniteVector(candidate.position, 3);
  normalizeQuaternion(candidate.orientation);
}

export function planCartesianLine(
  model: RobotModel,
  start: JointVector,
  target: Pose,
  options: CartesianTrajectoryOptions,
): TrajectoryResult {
  validateJoints(model, start);
  validatePose(target);
  if (typeof options !== "object" || options === null) throw new TypeError("Options are required.");
  validateTiming(options.duration, options.sampleCount);
  const startPose = forwardKinematics(model, start).endEffector;
  const targetOrientation = normalizeQuaternion(target.orientation);
  const samples: TrajectorySample[] = [];
  let seed = freezeJoints(start);

  for (let index = 0; index < options.sampleCount; index += 1) {
    const u = index / (options.sampleCount - 1);
    const desired: Pose = {
      position: startPose.position.map((value, axis) =>
        value + (target.position[axis] - value) * u) as unknown as Pose["position"],
      orientation: slerpShortest(startPose.orientation, targetOrientation, u),
    };
    const result = index === 0
      ? { status: "converged" as const, joints: seed }
      : solveInverseKinematics(model, desired, seed, {
        maxIterations: 240,
        positionTolerance: 5e-5,
        orientationTolerance: 5e-4,
        damping: 0.05,
        stepSize: 0.7,
        maxHistoryEntries: 32,
        ...options.ik,
      });
    if (result.status !== "converged") {
      return Object.freeze({
        status: "failed",
        failureCode: "IK_FAILED",
        failureReason: `IK failed at sample ${index}: ${result.failureCode}.`,
        failedSample: index,
        partialSamples: Object.freeze(samples),
      });
    }
    const pose = forwardKinematics(model, result.joints).endEffector;
    const time = options.duration * u;
    const previous = samples.at(-1);
    const dt = previous ? time - previous.time : options.duration / (options.sampleCount - 1);
    const velocities = previous
      ? result.joints.map((value, joint) => (value - previous.joints[joint]) / dt)
      : [0, 0, 0, 0, 0, 0];
    samples.push(freezeSample(time, result.joints, pose, velocities));
    seed = result.joints;
  }
  return Object.freeze({ status: "planned", trajectory: freezeTrajectory("cartesian", options.duration, samples) });
}

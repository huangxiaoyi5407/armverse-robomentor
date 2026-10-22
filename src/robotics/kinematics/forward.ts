import type {
  JointVector,
  Matrix4,
  Pose,
  Quaternion,
  RobotModel,
  Vector3,
} from "@/robotics/types";
import { assertFiniteVector } from "@/robotics/types";
import { dhTransform, identityMatrix4, multiplyMatrix4 } from "./transform";

const JOINT_COUNT = 6;
/** Values at or below this magnitude are treated as the 180-degree sign tie. */
const QUATERNION_SIGN_TIE_TOLERANCE = 1e-12;

function assertFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateModel(model: unknown): asserts model is RobotModel {
  if (typeof model !== "object" || model === null) {
    throw new TypeError("Robot model must be an object.");
  }

  const candidate = model as Partial<RobotModel>;
  if (
    candidate.dhConvention !== "standard" ||
    !Array.isArray(candidate.dhParameters) ||
    candidate.dhParameters.length !== JOINT_COUNT ||
    !Array.isArray(candidate.jointLimits) ||
    candidate.jointLimits.length !== JOINT_COUNT
  ) {
    throw new TypeError("Forward kinematics requires a six-joint standard-DH model.");
  }

  for (let index = 0; index < JOINT_COUNT; index += 1) {
    const row = candidate.dhParameters[index];
    if (
      typeof row !== "object" ||
      row === null ||
      !assertFiniteNumber(row.a) ||
      !assertFiniteNumber(row.d) ||
      !assertFiniteNumber(row.alpha) ||
      !assertFiniteNumber(row.thetaOffset)
    ) {
      throw new TypeError(`DH row ${index + 1} must contain finite numeric values.`);
    }

    const limit = candidate.jointLimits[index];
    if (
      typeof limit !== "object" ||
      limit === null ||
      !assertFiniteNumber(limit.min) ||
      !assertFiniteNumber(limit.max) ||
      limit.min > limit.max
    ) {
      throw new TypeError(`Joint limit ${index + 1} is malformed.`);
    }
  }
}

function validateJoints(model: RobotModel, joints: unknown): asserts joints is JointVector {
  assertFiniteVector(joints, JOINT_COUNT);
  for (let index = 0; index < JOINT_COUNT; index += 1) {
    const limit = model.jointLimits[index];
    if (joints[index] < limit.min || joints[index] > limit.max) {
      throw new RangeError(
        `Joint ${index + 1} must be within [${limit.min}, ${limit.max}] radians.`,
      );
    }
  }
}

function canonicalizeQuaternion(quaternion: readonly number[]): Quaternion {
  const magnitude = Math.hypot(...quaternion);
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new RangeError("Rotation matrix did not produce a valid quaternion.");
  }

  const normalized = quaternion.map((value) => value / magnitude);
  const signProbe = Math.abs(normalized[3]) > QUATERNION_SIGN_TIE_TOLERANCE
    ? normalized[3]
    : (normalized
      .slice(0, 3)
      .find((value) => Math.abs(value) > QUATERNION_SIGN_TIE_TOLERANCE) ?? 1);
  const sign = signProbe < 0 ? -1 : 1;
  return Object.freeze(normalized.map((value) => value * sign)) as unknown as Quaternion;
}

/** Converts the upper-left rotation block to an x,y,z,w unit quaternion. */
function matrixToQuaternion(matrix: Matrix4): Quaternion {
  const m00 = matrix[0];
  const m01 = matrix[1];
  const m02 = matrix[2];
  const m10 = matrix[4];
  const m11 = matrix[5];
  const m12 = matrix[6];
  const m20 = matrix[8];
  const m21 = matrix[9];
  const m22 = matrix[10];
  const trace = m00 + m11 + m22;

  if (trace > 0) {
    const scale = 2 * Math.sqrt(trace + 1);
    return canonicalizeQuaternion([
      (m21 - m12) / scale,
      (m02 - m20) / scale,
      (m10 - m01) / scale,
      scale / 4,
    ]);
  }
  if (m00 > m11 && m00 > m22) {
    const scale = 2 * Math.sqrt(1 + m00 - m11 - m22);
    return canonicalizeQuaternion([
      scale / 4,
      (m01 + m10) / scale,
      (m02 + m20) / scale,
      (m21 - m12) / scale,
    ]);
  }
  if (m11 > m22) {
    const scale = 2 * Math.sqrt(1 + m11 - m00 - m22);
    return canonicalizeQuaternion([
      (m01 + m10) / scale,
      scale / 4,
      (m12 + m21) / scale,
      (m02 - m20) / scale,
    ]);
  }

  const scale = 2 * Math.sqrt(1 + m22 - m00 - m11);
  return canonicalizeQuaternion([
    (m02 + m20) / scale,
    (m12 + m21) / scale,
    scale / 4,
    (m10 - m01) / scale,
  ]);
}

function matrixToPose(matrix: Matrix4): Pose {
  const position = Object.freeze([matrix[3], matrix[7], matrix[11]]) as Vector3;
  return Object.freeze({
    position,
    orientation: matrixToQuaternion(matrix),
  });
}
export function forwardKinematics(
  model: RobotModel,
  joints: JointVector,
): { readonly endEffector: Pose; readonly frames: readonly Matrix4[] } {
  validateModel(model);
  validateJoints(model, joints);

  let cumulative = identityMatrix4();
  const frames: Matrix4[] = [];
  for (let index = 0; index < JOINT_COUNT; index += 1) {
    cumulative = multiplyMatrix4(
      cumulative,
      dhTransform(model.dhParameters[index], joints[index]),
    );
    frames.push(cumulative);
  }

  const immutableFrames = Object.freeze(frames);
  return Object.freeze({
    endEffector: matrixToPose(immutableFrames[JOINT_COUNT - 1]),
    frames: immutableFrames,
  });
}

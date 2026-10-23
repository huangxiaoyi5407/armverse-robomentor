import { forwardKinematics } from "@/robotics/kinematics";
import { singularityMetrics, geometricJacobian } from "@/robotics/jacobian";
import type { Trajectory } from "@/robotics/trajectory";
import type { JointVector, RobotModel, Vector3 } from "@/robotics/types";
import { assertFiniteVector } from "@/robotics/types";
import { segmentIntersectsExpandedBox, type AxisAlignedBox } from "./collision";

const WORKSPACE_RADIUS_METRES = 1.1;
const LINK_CAPSULE_RADIUS_METRES = 0.035;

export interface SafetyEnvironment {
  readonly obstacles: readonly AxisAlignedBox[];
}

export type SafetyFindingCode =
  | "NON_FINITE_SAMPLE"
  | "JOINT_LIMIT"
  | "WORKSPACE_BOUNDS"
  | "POSE_MISMATCH"
  | "OBSTACLE_COLLISION"
  | "SINGULARITY_RISK";

export interface SafetyFinding {
  readonly code: SafetyFindingCode;
  readonly severity: "warning" | "blocked";
  readonly sampleIndex: number;
  readonly message: string;
  readonly jointIndex?: number;
  readonly obstacleId?: string;
}

export interface SafetyReport {
  readonly verdict: "safe" | "warning" | "blocked";
  readonly findings: readonly SafetyFinding[];
  readonly validatedSamples: number;
  readonly approvedTrajectory: Trajectory | null;
}

function finding(value: SafetyFinding): SafetyFinding {
  return Object.freeze(value);
}

function validateEnvironment(environment: unknown): asserts environment is SafetyEnvironment {
  if (typeof environment !== "object" || environment === null ||
      !Array.isArray((environment as SafetyEnvironment).obstacles)) {
    throw new TypeError("Safety environment must contain an obstacle array.");
  }
  for (const obstacle of (environment as SafetyEnvironment).obstacles) {
    if (typeof obstacle !== "object" || obstacle === null || typeof obstacle.id !== "string" || !obstacle.id) {
      throw new TypeError("Every obstacle requires an id.");
    }
    assertFiniteVector(obstacle.min, 3);
    assertFiniteVector(obstacle.max, 3);
    for (let axis = 0; axis < 3; axis += 1) {
      if (obstacle.min[axis] > obstacle.max[axis]) throw new RangeError("Obstacle bounds are reversed.");
    }
  }
}

function finiteSample(sample: Trajectory["samples"][number]): boolean {
  const values = [
    sample.time,
    ...sample.joints,
    ...sample.velocities,
    ...sample.pose.position,
    ...sample.pose.orientation,
  ];
  return sample.joints.length === 6 && sample.velocities.length === 6 &&
    sample.pose.position.length === 3 && sample.pose.orientation.length === 4 &&
    values.every((value) => typeof value === "number" && Number.isFinite(value));
}

function frameOrigins(joints: JointVector, model: RobotModel): Vector3[] {
  const frames = forwardKinematics(model, joints).frames;
  return [
    [0, 0, 0],
    ...frames.map((frame) => [frame[3], frame[7], frame[11]] as Vector3),
  ];
}

export function validateTrajectory(
  model: RobotModel,
  trajectory: Trajectory,
  environment: SafetyEnvironment,
): SafetyReport {
  validateEnvironment(environment);
  if (typeof trajectory !== "object" || trajectory === null || !Array.isArray(trajectory.samples) ||
      trajectory.samples.length < 1) {
    throw new TypeError("Trajectory must contain samples.");
  }
  const findings: SafetyFinding[] = [];
  let validatedSamples = 0;

  for (let sampleIndex = 0; sampleIndex < trajectory.samples.length; sampleIndex += 1) {
    const sample = trajectory.samples[sampleIndex];
    if (!finiteSample(sample)) {
      findings.push(finding({
        code: "NON_FINITE_SAMPLE", severity: "blocked", sampleIndex,
        message: "Trajectory sample contains malformed or non-finite values.",
      }));
      break;
    }

    let limitViolation = false;
    for (let jointIndex = 0; jointIndex < 6; jointIndex += 1) {
      const limit = model.jointLimits[jointIndex];
      if (sample.joints[jointIndex] < limit.min || sample.joints[jointIndex] > limit.max) {
        findings.push(finding({
          code: "JOINT_LIMIT", severity: "blocked", sampleIndex, jointIndex,
          message: `Joint ${jointIndex + 1} exceeds its configured limit.`,
        }));
        limitViolation = true;
        break;
      }
    }
    if (limitViolation) break;

    if (Math.hypot(...sample.pose.position) > WORKSPACE_RADIUS_METRES) {
      findings.push(finding({
        code: "WORKSPACE_BOUNDS", severity: "blocked", sampleIndex,
        message: "Declared flange pose is outside the teaching workspace.",
      }));
      break;
    }

    const actual = forwardKinematics(model, sample.joints).endEffector;
    if (Math.hypot(...actual.position.map((value, axis) => value - sample.pose.position[axis])) > 0.002) {
      findings.push(finding({
        code: "POSE_MISMATCH", severity: "blocked", sampleIndex,
        message: "Declared pose does not match deterministic forward kinematics.",
      }));
      break;
    }

    const origins = frameOrigins(sample.joints, model);
    let collision: AxisAlignedBox | undefined;
    for (const obstacle of environment.obstacles) {
      for (let link = 0; link < origins.length - 1; link += 1) {
        if (segmentIntersectsExpandedBox(
          origins[link], origins[link + 1], obstacle, LINK_CAPSULE_RADIUS_METRES,
        )) {
          collision = obstacle;
          break;
        }
      }
      if (collision) break;
    }
    if (collision) {
      findings.push(finding({
        code: "OBSTACLE_COLLISION", severity: "blocked", sampleIndex,
        obstacleId: collision.id,
        message: `A simplified link capsule intersects obstacle ${collision.id}.`,
      }));
      break;
    }

    const risk = singularityMetrics(geometricJacobian(model, sample.joints)).risk;
    if (risk !== "safe" && !findings.some((entry) => entry.code === "SINGULARITY_RISK")) {
      findings.push(finding({
        code: "SINGULARITY_RISK", severity: "warning", sampleIndex,
        message: `Jacobian singularity risk is ${risk}.`,
      }));
    }
    validatedSamples += 1;
  }

  const blocked = findings.some((entry) => entry.severity === "blocked");
  const verdict: SafetyReport["verdict"] = blocked
    ? "blocked"
    : findings.length > 0 ? "warning" : "safe";
  return Object.freeze({
    verdict,
    findings: Object.freeze(findings),
    validatedSamples,
    approvedTrajectory: blocked ? null : trajectory,
  });
}

export type { AxisAlignedBox } from "./collision";

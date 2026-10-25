import type { Trajectory } from "@/robotics/trajectory";

export const UR5_JOINT_NAMES = Object.freeze([
  "shoulder_pan_joint", "shoulder_lift_joint", "elbow_joint",
  "wrist_1_joint", "wrist_2_joint", "wrist_3_joint",
]);

export interface RosDuration { readonly sec: number; readonly nanosec: number }
export interface JointTrajectoryPoint {
  readonly positions: readonly number[];
  readonly velocities: readonly number[];
  readonly time_from_start: RosDuration;
}
export interface JointTrajectoryMessage {
  readonly joint_names: readonly string[];
  readonly points: readonly JointTrajectoryPoint[];
}

function duration(value: number): RosDuration {
  let sec = Math.floor(value);
  let nanosec = Math.round((value - sec) * 1_000_000_000);
  if (nanosec === 1_000_000_000) { sec += 1; nanosec = 0; }
  return Object.freeze({ sec, nanosec });
}

export function toJointTrajectoryMessage(trajectory: Trajectory): JointTrajectoryMessage {
  if (typeof trajectory !== "object" || trajectory === null || !Array.isArray(trajectory.samples) || trajectory.samples.length === 0) {
    throw new TypeError("Trajectory must contain samples.");
  }
  let previousTime = -1;
  const points = trajectory.samples.map((sample) => {
    if (!Number.isFinite(sample.time) || sample.joints.length !== 6 || sample.velocities.length !== 6 ||
        ![...sample.joints, ...sample.velocities].every(Number.isFinite)) {
      throw new TypeError("Trajectory samples must contain six finite positions and velocities.");
    }
    if (sample.time < 0 || sample.time < previousTime) throw new RangeError("Trajectory sample times must be monotonic and non-negative.");
    previousTime = sample.time;
    return Object.freeze({
      positions: Object.freeze([...sample.joints]),
      velocities: Object.freeze([...sample.velocities]),
      time_from_start: duration(sample.time),
    });
  });
  return Object.freeze({ joint_names: UR5_JOINT_NAMES, points: Object.freeze(points) });
}

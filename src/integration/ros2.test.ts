import { describe, expect, it } from "vitest";
import { planJointTrajectory } from "@/robotics/trajectory";
import { INITIAL_JOINTS } from "@/features/simulator/store";
import { toJointTrajectoryMessage } from "./ros2";

describe("ROS 2 JointTrajectory export", () => {
  it("serializes six UR5 joints and exact sec/nanosec durations", () => {
    const trajectory = planJointTrajectory(INITIAL_JOINTS, Object.freeze([0.3, -0.7, 0.9, -0.3, 0.5, -0.1]), { duration: 1.5, sampleCount: 3, mode: "quintic" });
    const message = toJointTrajectoryMessage(trajectory);

    expect(message.joint_names).toEqual(["shoulder_pan_joint", "shoulder_lift_joint", "elbow_joint", "wrist_1_joint", "wrist_2_joint", "wrist_3_joint"]);
    expect(message.points).toHaveLength(3);
    expect(message.points[1].time_from_start).toEqual({ sec: 0, nanosec: 750_000_000 });
    expect(message.points[2].time_from_start).toEqual({ sec: 1, nanosec: 500_000_000 });
    expect(message.points[2].positions).toEqual([0.3, -0.7, 0.9, -0.3, 0.5, -0.1]);
  });

  it("rejects malformed, non-finite, and non-monotonic samples", () => {
    const valid = planJointTrajectory(INITIAL_JOINTS, INITIAL_JOINTS, { duration: 1, sampleCount: 2, mode: "cubic" });
    expect(() => toJointTrajectoryMessage({ ...valid, samples: [] })).toThrow(TypeError);
    expect(() => toJointTrajectoryMessage({ ...valid, samples: [{ ...valid.samples[0], joints: [0, 0] }, valid.samples[1]] } as never)).toThrow(TypeError);
    expect(() => toJointTrajectoryMessage({ ...valid, samples: [valid.samples[1], valid.samples[0]] })).toThrow(RangeError);
    expect(() => toJointTrajectoryMessage({ ...valid, samples: [{ ...valid.samples[0], time: Number.NaN }, valid.samples[1]] })).toThrow(TypeError);
  });
});

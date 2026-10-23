import { describe, expect, it } from "vitest";
import { forwardKinematics } from "@/robotics/kinematics";
import { planCartesianLine, planJointTrajectory } from "@/robotics/trajectory";
import type { JointVector, Pose } from "@/robotics/types";
import { UR5_MODEL } from "@/robotics/ur5-model";

const START = [0.2, -0.8, 1, -0.4, 0.6, -0.2] as JointVector;
const END = [0.5, -1, 1.2, -0.6, 0.8, 0.1] as JointVector;

describe("planJointTrajectory", () => {
  it("returns exact endpoints and monotonic timestamps", () => {
    const result = planJointTrajectory(START, END, {
      duration: 2,
      sampleCount: 11,
      mode: "cubic",
    });
    expect(result.samples).toHaveLength(11);
    expect(result.samples[0].joints).toEqual(START);
    expect(result.samples.at(-1)?.joints).toEqual(END);
    expect(result.samples[0].time).toBe(0);
    expect(result.samples.at(-1)?.time).toBe(2);
    expect(result.samples.every((sample, index) =>
      index === 0 || sample.time > result.samples[index - 1].time)).toBe(true);
  });

  it("has zero endpoint velocity in quintic mode", () => {
    const result = planJointTrajectory(START, END, {
      duration: 3,
      sampleCount: 9,
      mode: "quintic",
    });
    expect(result.samples[0].velocities).toEqual([0, 0, 0, 0, 0, 0]);
    expect(result.samples.at(-1)?.velocities).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("rejects out-of-limit, malformed, and invalid options", () => {
    expect(() => planJointTrajectory(START, [7, 0, 0, 0, 0, 0] as JointVector, {
      duration: 1, sampleCount: 3, mode: "cubic",
    })).toThrow(RangeError);
    expect(() => planJointTrajectory(new Array(6) as unknown as JointVector, END, {
      duration: 1, sampleCount: 3, mode: "cubic",
    })).toThrow(TypeError);
    expect(() => planJointTrajectory(START, END, {
      duration: 0, sampleCount: 1, mode: "linear" as never,
    })).toThrow();
  });

  it("returns deeply immutable finite samples without mutating inputs", () => {
    const startBefore = [...START];
    const result = planJointTrajectory(START, END, {
      duration: 1, sampleCount: 5, mode: "quintic",
    });
    expect(START).toEqual(startBefore);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.samples)).toBe(true);
    expect(result.samples.every((sample) =>
      Object.isFrozen(sample) && Object.isFrozen(sample.joints) &&
      Object.isFrozen(sample.velocities) && Object.isFrozen(sample.pose))).toBe(true);
    expect(result.samples.flatMap((sample) => [
      sample.time, ...sample.joints, ...sample.velocities, ...sample.pose.position,
      ...sample.pose.orientation,
    ]).every(Number.isFinite)).toBe(true);
  });
});

describe("planCartesianLine", () => {
  it("keeps sampled positions on the requested straight line and reaches the target", () => {
    const target = forwardKinematics(UR5_MODEL, END).endEffector;
    const result = planCartesianLine(UR5_MODEL, START, target, {
      duration: 2,
      sampleCount: 9,
      ik: { maxIterations: 300, damping: 0.05, stepSize: 0.7 },
    });
    expect(result.status).toBe("planned");
    if (result.status !== "planned") return;
    const startPose = forwardKinematics(UR5_MODEL, START).endEffector;
    result.trajectory.samples.forEach((sample, index) => {
      const u = index / (result.trajectory.samples.length - 1);
      sample.pose.position.forEach((value, axis) => {
        const expected = startPose.position[axis] +
          (target.position[axis] - startPose.position[axis]) * u;
        expect(value).toBeCloseTo(expected, 3);
      });
    });
    const finalPose = result.trajectory.samples.at(-1)!.pose;
    expect(Math.hypot(...finalPose.position.map((value, axis) =>
      value - target.position[axis]))).toBeLessThanOrEqual(0.001);
  });

  it("fails gracefully with diagnostics when an intermediate target is unreachable", () => {
    const target: Pose = { position: [3, 3, 3], orientation: [0, 0, 0, 1] };
    const result = planCartesianLine(UR5_MODEL, START, target, {
      duration: 1,
      sampleCount: 5,
      ik: { maxIterations: 20 },
    });
    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;
    expect(result.failureCode).toBe("IK_FAILED");
    expect(result.failedSample).toBeGreaterThan(0);
    expect(result.partialSamples.length).toBeLessThan(5);
  });

  it("uses shortest-path quaternion interpolation for q and -q", () => {
    const current = forwardKinematics(UR5_MODEL, START).endEffector;
    const negated: Pose = {
      position: current.position,
      orientation: current.orientation.map((value) => -value) as unknown as Pose["orientation"],
    };
    const result = planCartesianLine(UR5_MODEL, START, negated, {
      duration: 1, sampleCount: 4,
    });
    expect(result.status).toBe("planned");
    if (result.status !== "planned") return;
    expect(result.trajectory.samples.every((sample) =>
      sample.joints.every((value, index) => Math.abs(value - START[index]) < 1e-8))).toBe(true);
  });
});

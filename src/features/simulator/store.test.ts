import { beforeEach, describe, expect, it } from "vitest";
import { planJointTrajectory } from "@/robotics/trajectory";
import { validateTrajectory } from "@/robotics/safety";
import type { JointVector } from "@/robotics/types";
import { UR5_MODEL } from "@/robotics/ur5-model";
import { INITIAL_JOINTS, useSimulationStore } from "./store";

const END = [0.4, -0.9, 1.1, -0.5, 0.7, 0] as JointVector;

function approved() {
  const trajectory = planJointTrajectory(INITIAL_JOINTS, END, {
    duration: 1, sampleCount: 3, mode: "quintic",
  });
  return { trajectory, report: validateTrajectory(UR5_MODEL, trajectory, { obstacles: [] }) };
}

describe("simulation store", () => {
  beforeEach(() => useSimulationStore.getState().reset());

  it("updates a joint and rejects invalid values", () => {
    useSimulationStore.getState().setJoint(2, 0.5);
    expect(useSimulationStore.getState().joints[2]).toBe(0.5);
    expect(() => useSimulationStore.getState().setJoint(0, Number.NaN)).toThrow(TypeError);
    expect(() => useSimulationStore.getState().setJoint(0, 7)).toThrow(RangeError);
  });

  it("cancels playback without committing the preview pose", () => {
    const { trajectory, report } = approved();
    const operationId = useSimulationStore.getState().previewTrajectory(trajectory, report);
    useSimulationStore.getState().play(operationId);
    useSimulationStore.getState().cancel();
    useSimulationStore.getState().commitCompletedTrajectory(operationId);
    expect(useSimulationStore.getState().joints).toEqual(INITIAL_JOINTS);
    expect(useSimulationStore.getState().status).toBe("cancelled");
  });

  it("advances through intermediate trajectory samples before completion", () => {
    const { trajectory, report } = approved();
    const operationId = useSimulationStore.getState().previewTrajectory(trajectory, report);
    useSimulationStore.getState().play(operationId);
    useSimulationStore.getState().advanceTrajectory(operationId, 0.5);
    const midpoint = useSimulationStore.getState();
    expect(midpoint.status).toBe("playing");
    expect(midpoint.joints).not.toEqual(INITIAL_JOINTS);
    expect(midpoint.joints).not.toEqual(END);
    expect(midpoint.playbackTime).toBe(0.5);
  });

  it("ignores stale completion and commits only the current safe operation", () => {
    const first = approved();
    const firstId = useSimulationStore.getState().previewTrajectory(first.trajectory, first.report);
    const second = approved();
    const secondId = useSimulationStore.getState().previewTrajectory(second.trajectory, second.report);
    useSimulationStore.getState().commitCompletedTrajectory(firstId);
    expect(useSimulationStore.getState().joints).toEqual(INITIAL_JOINTS);
    useSimulationStore.getState().commitCompletedTrajectory(secondId);
    expect(useSimulationStore.getState().joints).toEqual(END);
    expect(useSimulationStore.getState().status).toBe("complete");
  });

  it("never previews or commits a blocked trajectory", () => {
    const { trajectory } = approved();
    const blocked = validateTrajectory(UR5_MODEL, trajectory, {
      obstacles: [{ id: "all", min: [-1, -1, -1], max: [1, 1, 1] }],
    });
    const operationId = useSimulationStore.getState().previewTrajectory(trajectory, blocked);
    useSimulationStore.getState().commitCompletedTrajectory(operationId);
    expect(useSimulationStore.getState().joints).toEqual(INITIAL_JOINTS);
    expect(useSimulationStore.getState().status).toBe("blocked");
    expect(useSimulationStore.getState().activeOperationId).toBeNull();
  });
});

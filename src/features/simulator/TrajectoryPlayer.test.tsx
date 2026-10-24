import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateTrajectory } from "@/robotics/safety";
import { planJointTrajectory } from "@/robotics/trajectory";
import type { JointVector } from "@/robotics/types";
import { UR5_MODEL } from "@/robotics/ur5-model";
import { TrajectoryPlayer } from "./TrajectoryPlayer";
import { INITIAL_JOINTS, useSimulationStore } from "./store";

const END = [0.4, -0.9, 1.1, -0.5, 0.7, 0] as JointVector;

describe("TrajectoryPlayer", () => {
  beforeEach(() => useSimulationStore.getState().reset());

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("treats a same-frame animation timestamp as zero elapsed time", () => {
    const trajectory = planJointTrajectory(INITIAL_JOINTS, END, {
      duration: 1,
      sampleCount: 3,
      mode: "quintic",
    });
    const report = validateTrajectory(UR5_MODEL, trajectory, { obstacles: [] });
    const operationId = useSimulationStore.getState().previewTrajectory(trajectory, report);
    useSimulationStore.getState().play(operationId);

    vi.spyOn(performance, "now").mockReturnValue(100);
    let requestCount = 0;
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      requestCount += 1;
      if (requestCount === 1) callback(99);
      return requestCount;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    expect(() => render(<TrajectoryPlayer />)).not.toThrow();
    expect(useSimulationStore.getState().playbackTime).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { planJointTrajectory, type Trajectory } from "@/robotics/trajectory";
import { validateTrajectory } from "@/robotics/safety";
import type { JointVector } from "@/robotics/types";
import { UR5_MODEL } from "@/robotics/ur5-model";

const START = [0.2, -0.8, 1, -0.4, 0.6, -0.2] as JointVector;
const END = [0.4, -0.9, 1.1, -0.5, 0.7, 0] as JointVector;

function safeTrajectory(): Trajectory {
  return planJointTrajectory(START, END, { duration: 1, sampleCount: 7, mode: "quintic" });
}

describe("validateTrajectory", () => {
  it("accepts a safe motion with ordered immutable findings", () => {
    const report = validateTrajectory(UR5_MODEL, safeTrajectory(), { obstacles: [] });
    expect(report.verdict).toBe("safe");
    expect(report.findings).toEqual([]);
    expect(report.validatedSamples).toBe(7);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.findings)).toBe(true);
  });

  it("blocks joint-limit violations and non-finite samples", () => {
    const base = safeTrajectory();
    const badLimit = structuredClone(base) as unknown as { samples: Array<{ joints: number[] }> };
    badLimit.samples[2].joints[0] = 7;
    expect(validateTrajectory(UR5_MODEL, badLimit as unknown as Trajectory, { obstacles: [] }))
      .toMatchObject({ verdict: "blocked", findings: [{ code: "JOINT_LIMIT" }] });

    const badFinite = structuredClone(base) as unknown as { samples: Array<{ velocities: number[] }> };
    badFinite.samples[1].velocities[3] = Number.NaN;
    expect(validateTrajectory(UR5_MODEL, badFinite as unknown as Trajectory, { obstacles: [] }))
      .toMatchObject({ verdict: "blocked", findings: [{ code: "NON_FINITE_SAMPLE" }] });
  });

  it("blocks declared poses outside the UR5 teaching workspace", () => {
    const trajectory = structuredClone(safeTrajectory()) as unknown as {
      samples: Array<{ pose: { position: number[] } }>;
    };
    trajectory.samples[3].pose.position = [3, 0, 0];
    const report = validateTrajectory(UR5_MODEL, trajectory as unknown as Trajectory, { obstacles: [] });
    expect(report.verdict).toBe("blocked");
    expect(report.findings.some((finding) => finding.code === "WORKSPACE_BOUNDS")).toBe(true);
  });

  it("warns for a singular sample without approving it as fully safe", () => {
    const singular = planJointTrajectory(
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      { duration: 1, sampleCount: 2, mode: "cubic" },
    );
    const report = validateTrajectory(UR5_MODEL, singular, { obstacles: [] });
    expect(report.verdict).toBe("warning");
    expect(report.findings.some((finding) => finding.code === "SINGULARITY_RISK")).toBe(true);
  });

  it("blocks a capsule collision with an axis-aligned obstacle", () => {
    const trajectory = planJointTrajectory(
      [0, 0, 0, 0, 0, 0],
      [0.05, -0.05, 0.05, 0, 0, 0],
      { duration: 1, sampleCount: 3, mode: "cubic" },
    );
    const report = validateTrajectory(UR5_MODEL, trajectory, {
      obstacles: [{ id: "base-box", min: [-0.06, -0.06, 0.02], max: [0.06, 0.06, 0.12] }],
    });
    expect(report.verdict).toBe("blocked");
    expect(report.findings.some((finding) =>
      finding.code === "OBSTACLE_COLLISION" && finding.obstacleId === "base-box")).toBe(true);
  });

  it("never mutates the trajectory or promotes a blocked pose", () => {
    const trajectory = safeTrajectory();
    const before = JSON.stringify(trajectory);
    const obstacle = { id: "blocking", min: [-1, -1, -1] as const, max: [1, 1, 1] as const };
    const report = validateTrajectory(UR5_MODEL, trajectory, { obstacles: [obstacle] });
    expect(report.verdict).toBe("blocked");
    expect(report.approvedTrajectory).toBeNull();
    expect(JSON.stringify(trajectory)).toBe(before);
    expect(trajectory.samples[0].joints).toEqual(START);
  });
});

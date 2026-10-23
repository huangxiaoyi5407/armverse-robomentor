import { describe, expect, it, vi } from "vitest";
import type { AIProvider } from "./providers/types";
import { runTeachingWorkflow } from "./workflow";

const snapshot = { joints: [0.2, -0.8, 1, -0.4, 0.6, -0.2] as const, environment: { obstacles: [] } };

function provider(target: [number, number, number, number, number, number] = [0.3, -0.7, 0.9, -0.3, 0.5, -0.1]): AIProvider {
  return { run: vi.fn(async (request) => {
    if (request.agent === "planner") return { agent: "planner" as const, mode: "demo" as const, label: "Demo 演示模式", result: { action: "move_joints" as const, joints: target, rationale: "test" } };
    if (request.agent === "safety") return { agent: "safety" as const, mode: "demo" as const, label: "Demo 演示模式", result: { verdict: "approved" as const, findings: [], explanation: "looks safe" } };
    return { agent: "tutor" as const, mode: "demo" as const, label: "Demo 演示模式", result: { title: "结果", explanation: "grounded", questions: [] } };
  }) };
}

describe("three-agent teaching workflow", () => {
  it("plans, validates and returns only a deterministically approved trajectory", async () => {
    const result = await runTeachingWorkflow("移动到教学姿态", snapshot, { provider: provider() }, new AbortController().signal);
    expect(result.outcome).toBe("ready");
    expect(result.trajectory).not.toBeNull();
    expect(result.safety.approvedTrajectory).toBe(result.trajectory);
    expect(result.timeline.map((entry) => entry.state)).toEqual(["planning", "validating", "reviewing", "executing", "explaining", "complete"]);
  });

  it("blocks execution even when the safety agent text approves", async () => {
    const blockedSnapshot = { ...snapshot, environment: { obstacles: [{ id: "whole-cell", min: [-1, -1, -1] as const, max: [1, 1, 1] as const }] } };
    const result = await runTeachingWorkflow("移动", blockedSnapshot, { provider: provider() }, new AbortController().signal);
    expect(result.outcome).toBe("blocked");
    expect(result.trajectory).toBeNull();
    expect(result.safety.verdict).toBe("blocked");
    expect(result.timeline.some((entry) => entry.state === "blocked")).toBe(true);
  });

  it("grounds the tutor request in immutable deterministic findings", async () => {
    const mockProvider = provider();
    const run = vi.mocked(mockProvider.run);
    await runTeachingWorkflow("移动", { ...snapshot, environment: { obstacles: [{ id: "fixture", min: [-1, -1, -1], max: [1, 1, 1] }] } }, { provider: mockProvider }, new AbortController().signal);
    const tutorRequest = run.mock.calls.find(([request]) => request.agent === "tutor")?.[0];
    expect(tutorRequest?.prompt).toContain("OBSTACLE_COLLISION");
  });

  it("uses the deterministic demo plan when an AI plan is structurally invalid", async () => {
    const invalidProvider = provider();
    const originalRun = invalidProvider.run;
    invalidProvider.run = vi.fn(async (request, signal) => request.agent === "planner"
      ? ({ agent: "planner", mode: "online", label: "bad", result: { action: "run_code", code: "evil()" } } as never)
      : originalRun(request, signal));
    const result = await runTeachingWorkflow("移动", snapshot, { provider: invalidProvider }, new AbortController().signal);
    expect(result.modeLabel).toContain("规划回退");
    expect(result.timeline.find((entry) => entry.state === "validating")?.message).toContain("回退");
  });

  it("honours abort before any agent work", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(runTeachingWorkflow("停止", snapshot, { provider: provider() }, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import type { SafetyReport } from "@/robotics/safety";
import { useTrainingStore } from "./training-store";

describe("training session store", () => {
  beforeEach(() => useTrainingStore.getState().resetSession());

  it("starts a session and ignores writes from stale session ids", () => {
    const first = useTrainingStore.getState().startSession("SYN-001", "TASK-PATH");
    const second = useTrainingStore.getState().startSession("SYN-002", "TASK-SAFETY");
    useTrainingStore.getState().recordEvent(first, { code: "IK_FAILED", severity: "warning", elapsedMs: 10 });
    useTrainingStore.getState().recordEvent(second, { code: "IK_SOLVED", severity: "info", elapsedMs: 20 });

    expect(useTrainingStore.getState().session?.events.map((event) => event.code)).toEqual(["SESSION_STARTED", "IK_SOLVED"]);
  });

  it("does not mutate a completed session", () => {
    const id = useTrainingStore.getState().startSession("SYN-001", "TASK-PATH");
    useTrainingStore.getState().completeSession(id);
    const completed = useTrainingStore.getState().session;
    useTrainingStore.getState().recordEvent(id, { code: "RESET", severity: "info", elapsedMs: 99 });
    expect(useTrainingStore.getState().session).toBe(completed);
    expect(completed?.status).toBe("completed");
  });

  it("records deterministic safety findings as trace events", () => {
    const id = useTrainingStore.getState().startSession("SYN-001", "TASK-SAFETY");
    const report: SafetyReport = Object.freeze({
      verdict: "blocked",
      validatedSamples: 4,
      approvedTrajectory: null,
      findings: Object.freeze([
        Object.freeze({ code: "SINGULARITY_RISK", severity: "warning", sampleIndex: 2, message: "near singular" }),
        Object.freeze({ code: "OBSTACLE_COLLISION", severity: "blocked", sampleIndex: 4, message: "collision" }),
      ]),
    });
    useTrainingStore.getState().attachSafetyReport(id, report, 100);

    expect(useTrainingStore.getState().session?.events.slice(1).map((event) => ({
      code: event.code,
      findingCode: event.findingCode,
      severity: event.severity,
    }))).toEqual([
      { code: "SINGULARITY_WARNING", findingCode: "SINGULARITY_RISK", severity: "warning" },
      { code: "SAFETY_BLOCKED", findingCode: "OBSTACLE_COLLISION", severity: "blocked" },
    ]);
  });

  it("isolates reset state from a previous session", () => {
    const id = useTrainingStore.getState().startSession("SYN-001", "TASK-PATH");
    useTrainingStore.getState().recordEvent(id, { code: "SAFETY_BLOCKED", severity: "blocked", elapsedMs: 10 });
    useTrainingStore.getState().resetSession();
    expect(useTrainingStore.getState().session).toBeNull();
    const next = useTrainingStore.getState().startSession("SYN-001", "TASK-PATH");
    expect(next).not.toBe(id);
    expect(useTrainingStore.getState().session?.events.map((event) => event.code)).toEqual(["SESSION_STARTED"]);
  });
});

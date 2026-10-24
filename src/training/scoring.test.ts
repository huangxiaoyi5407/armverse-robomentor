import { describe, expect, it } from "vitest";
import { appendTrainingEvent, createTrainingEvent, createTrainingSession, type TrainingEventCode } from "./events";
import { scoreTrainingSession } from "./scoring";

function traced(codes: readonly TrainingEventCode[], completed = true) {
  let session = createTrainingSession({ id: "SESSION-1", studentId: "SYN-001", taskId: "TASK-PATH" });
  codes.forEach((code, index) => {
    session = appendTrainingEvent(session, createTrainingEvent({
      id: `EVENT-${index + 1}`,
      sessionId: session.id,
      elapsedMs: index * 100,
      code,
      severity: code === "SAFETY_BLOCKED" ? "blocked" : code === "SINGULARITY_WARNING" || code === "IK_FAILED" ? "warning" : "info",
    }));
  });
  return Object.freeze({ ...session, status: completed ? "completed" as const : "active" as const });
}

describe("training session score", () => {
  it("awards 100 points to a safe first-attempt completion", () => {
    expect(scoreTrainingSession(traced(["SESSION_STARTED", "ATTEMPT_STARTED", "IK_SOLVED", "TRAJECTORY_PLAYED", "SESSION_COMPLETED"]))).toEqual({
      total: 100,
      completion: 30,
      safety: 50,
      efficiency: 20,
      deductions: Object.freeze([]),
    });
  });

  it("keeps deterministic safety deductions even when the session completes", () => {
    const result = scoreTrainingSession(traced(["ATTEMPT_STARTED", "SAFETY_BLOCKED", "ATTEMPT_STARTED", "SESSION_COMPLETED"]));
    expect(result.safety).toBe(30);
    expect(result.efficiency).toBe(16);
    expect(result.total).toBe(76);
    expect(result.deductions).toContainEqual({ code: "SAFETY_BLOCKED", points: 20 });
  });

  it("deducts warnings and repeated invalid attempts without producing negative sections", () => {
    const result = scoreTrainingSession(traced(["ATTEMPT_STARTED", "IK_FAILED", "ATTEMPT_STARTED", "IK_FAILED", "ATTEMPT_STARTED", "SINGULARITY_WARNING"], false));
    expect(result.completion).toBe(0);
    expect(result.safety).toBeGreaterThanOrEqual(0);
    expect(result.efficiency).toBe(12);
    expect(result.total).toBe(result.completion + result.safety + result.efficiency);
  });

  it("scores an empty active session deterministically", () => {
    expect(scoreTrainingSession(createTrainingSession({ id: "EMPTY", studentId: "SYN-001", taskId: "TASK-PATH" }))).toEqual({
      total: 70,
      completion: 0,
      safety: 50,
      efficiency: 20,
      deductions: Object.freeze([]),
    });
  });
});

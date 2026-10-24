import { describe, expect, it } from "vitest";
import { appendTrainingEvent, createTrainingEvent, createTrainingSession } from "./events";

describe("training event trace", () => {
  it("appends immutable events with stable sequence numbers", () => {
    const initial = createTrainingSession({ id: "SESSION-1", studentId: "SYN-001", taskId: "TASK-PATH" });
    const first = appendTrainingEvent(initial, createTrainingEvent({
      id: "EVENT-1", sessionId: initial.id, elapsedMs: 0, code: "SESSION_STARTED", severity: "info",
    }));
    const second = appendTrainingEvent(first, createTrainingEvent({
      id: "EVENT-2", sessionId: initial.id, elapsedMs: 250, code: "TARGET_UPDATED", severity: "info",
      jointSnapshot: [0.2, -0.8, 1, -0.4, 0.6, -0.2],
    }));

    expect(initial.events).toHaveLength(0);
    expect(second.events.map((event) => event.sequence)).toEqual([1, 2]);
    expect(Object.isFrozen(second.events[1].jointSnapshot)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
  });

  it("rejects cross-session, duplicate, and out-of-order events", () => {
    const initial = createTrainingSession({ id: "SESSION-1", studentId: "SYN-001", taskId: "TASK-PATH" });
    const event = createTrainingEvent({ id: "EVENT-1", sessionId: initial.id, elapsedMs: 100, code: "IK_SOLVED", severity: "info" });
    const next = appendTrainingEvent(initial, event);

    expect(() => appendTrainingEvent(next, event)).toThrow(/duplicate/i);
    expect(() => appendTrainingEvent(next, createTrainingEvent({ id: "EVENT-2", sessionId: "SESSION-2", elapsedMs: 200, code: "RESET", severity: "info" }))).toThrow(/session/i);
    expect(() => appendTrainingEvent(next, createTrainingEvent({ id: "EVENT-3", sessionId: initial.id, elapsedMs: 99, code: "RESET", severity: "info" }))).toThrow(/order/i);
  });

  it("rejects non-finite time and malformed joint snapshots", () => {
    expect(() => createTrainingEvent({ id: "E", sessionId: "S", elapsedMs: Number.NaN, code: "RESET", severity: "info" })).toThrow(TypeError);
    expect(() => createTrainingEvent({ id: "E", sessionId: "S", elapsedMs: 0, code: "RESET", severity: "info", jointSnapshot: [0, 1] })).toThrow(TypeError);
    expect(() => createTrainingEvent({ id: "E", sessionId: "S", elapsedMs: 0, code: "RESET", severity: "info", jointSnapshot: [0, 0, 0, 0, 0, Number.POSITIVE_INFINITY] })).toThrow(TypeError);
  });
});

import { describe, expect, it } from "vitest";
import type { TrainingSessionSummary } from "./types";
import { calculateClassMetrics, groupTrainingErrors } from "./analytics";

const session = (overrides: Partial<TrainingSessionSummary>): TrainingSessionSummary => Object.freeze({
  id: "SESSION-1",
  studentId: "SYN-001",
  taskId: "TASK-1",
  status: "completed",
  attempts: 1,
  safetyScore: 100,
  errorCodes: Object.freeze([]),
  ...overrides,
});

describe("classroom analytics", () => {
  it("returns finite zero metrics for an empty class", () => {
    expect(calculateClassMetrics([])).toEqual({
      totalSessions: 0,
      completedSessions: 0,
      completionRate: 0,
      averageAttempts: 0,
      averageSafetyScore: 0,
      needsSupportCount: 0,
    });
  });

  it("calculates completion, attempts, safety, and support from session facts", () => {
    const result = calculateClassMetrics([
      session({ id: "A", status: "completed", attempts: 1, safetyScore: 96 }),
      session({ id: "B", status: "needs-support", attempts: 3, safetyScore: 64 }),
      session({ id: "C", status: "in-progress", attempts: 2, safetyScore: 80 }),
    ]);

    expect(result).toEqual({
      totalSessions: 3,
      completedSessions: 1,
      completionRate: 1 / 3,
      averageAttempts: 2,
      averageSafetyScore: 80,
      needsSupportCount: 1,
    });
  });

  it("groups error codes by descending frequency with stable code ordering", () => {
    const result = groupTrainingErrors([
      session({ id: "A", errorCodes: Object.freeze(["SINGULARITY", "COLLISION"]) }),
      session({ id: "B", errorCodes: Object.freeze(["COLLISION", "IK_FAILURE"]) }),
      session({ id: "C", errorCodes: Object.freeze(["SINGULARITY", "COLLISION"]) }),
    ]);

    expect(result).toEqual([
      { code: "COLLISION", count: 3 },
      { code: "SINGULARITY", count: 2 },
      { code: "IK_FAILURE", count: 1 },
    ]);
  });

  it("rejects non-finite or out-of-range numeric facts", () => {
    expect(() => calculateClassMetrics([session({ safetyScore: Number.NaN })])).toThrow(TypeError);
    expect(() => calculateClassMetrics([session({ safetyScore: 101 })])).toThrow(RangeError);
    expect(() => calculateClassMetrics([session({ attempts: 0 })])).toThrow(RangeError);
  });
});

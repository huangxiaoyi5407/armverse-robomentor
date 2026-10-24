import type { TrainingEventCode, TrainingSession } from "./events";

export interface TrainingDeduction {
  readonly code: TrainingEventCode;
  readonly points: number;
}

export interface TrainingScore {
  readonly total: number;
  readonly completion: number;
  readonly safety: number;
  readonly efficiency: number;
  readonly deductions: readonly TrainingDeduction[];
}

const SAFETY_DEDUCTIONS: Partial<Record<TrainingEventCode, number>> = {
  SAFETY_BLOCKED: 20,
  SINGULARITY_WARNING: 5,
  IK_FAILED: 5,
};

export function scoreTrainingSession(session: TrainingSession): TrainingScore {
  const completion = session.status === "completed" ? 30 : 0;
  const attemptCount = Math.max(1, session.events.filter((event) => event.code === "ATTEMPT_STARTED").length);
  const efficiency = Math.max(0, 20 - (attemptCount - 1) * 4);
  const deductions: TrainingDeduction[] = [];
  let safety = 50;
  for (const event of session.events) {
    const points = SAFETY_DEDUCTIONS[event.code];
    if (points === undefined) continue;
    deductions.push(Object.freeze({ code: event.code, points }));
    safety = Math.max(0, safety - points);
  }
  return Object.freeze({
    total: completion + safety + efficiency,
    completion,
    safety,
    efficiency,
    deductions: Object.freeze(deductions),
  });
}

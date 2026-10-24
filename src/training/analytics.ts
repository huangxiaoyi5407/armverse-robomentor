import type { ClassMetrics, ErrorGroup, TrainingSessionSummary } from "./types";

function validateSession(session: TrainingSessionSummary): void {
  if (!Number.isFinite(session.attempts) || !Number.isFinite(session.safetyScore)) {
    throw new TypeError("Training metrics must be finite.");
  }
  if (!Number.isInteger(session.attempts) || session.attempts < 1) {
    throw new RangeError("Training attempts must be a positive integer.");
  }
  if (session.safetyScore < 0 || session.safetyScore > 100) {
    throw new RangeError("Safety score must be between 0 and 100.");
  }
}

export function calculateClassMetrics(sessions: readonly TrainingSessionSummary[]): ClassMetrics {
  if (sessions.length === 0) {
    return Object.freeze({
      totalSessions: 0,
      completedSessions: 0,
      completionRate: 0,
      averageAttempts: 0,
      averageSafetyScore: 0,
      needsSupportCount: 0,
    });
  }

  let completedSessions = 0;
  let totalAttempts = 0;
  let totalSafetyScore = 0;
  let needsSupportCount = 0;
  for (const session of sessions) {
    validateSession(session);
    if (session.status === "completed") completedSessions += 1;
    if (session.status === "needs-support") needsSupportCount += 1;
    totalAttempts += session.attempts;
    totalSafetyScore += session.safetyScore;
  }

  return Object.freeze({
    totalSessions: sessions.length,
    completedSessions,
    completionRate: completedSessions / sessions.length,
    averageAttempts: totalAttempts / sessions.length,
    averageSafetyScore: totalSafetyScore / sessions.length,
    needsSupportCount,
  });
}

export function groupTrainingErrors(sessions: readonly TrainingSessionSummary[]): readonly ErrorGroup[] {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    validateSession(session);
    for (const code of session.errorCodes) counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return Object.freeze([...counts.entries()]
    .map(([code, count]) => Object.freeze({ code, count }))
    .sort((left, right) => right.count - left.count || (left.code < right.code ? -1 : left.code > right.code ? 1 : 0)));
}

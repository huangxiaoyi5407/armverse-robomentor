import type { TrainingEventSeverity, TrainingSession } from "./events";
import { scoreTrainingSession, type TrainingScore } from "./scoring";
import { SYNTHETIC_DATA_NOTICE } from "./synthetic-data";
import type { TrainingTask } from "./types";

export interface TrainingReportMetric {
  readonly label: string;
  readonly value: string;
  readonly sourceEventIds: readonly string[];
}

export interface TrainingReportSafetyEvent {
  readonly id: string;
  readonly code: string;
  readonly message: string;
  readonly severity: TrainingEventSeverity;
}

export interface TrainingReportModel {
  readonly sessionId: string;
  readonly studentId: string;
  readonly taskTitle: string;
  readonly objective: string;
  readonly generatedAtLabel: string;
  readonly dataNotice: string;
  readonly score: TrainingScore;
  readonly metrics: readonly TrainingReportMetric[];
  readonly safetyEvents: readonly TrainingReportSafetyEvent[];
}

function evidence(ids: readonly string[], fallback: string): readonly string[] {
  return Object.freeze(ids.length > 0 ? [...ids] : [fallback]);
}

export function buildTrainingReport(session: TrainingSession, task: TrainingTask): TrainingReportModel {
  if (session.status !== "completed") throw new Error("A complete session is required to build a report.");
  if (session.taskId !== task.id) throw new Error("Session task does not match the report task.");
  if (session.events.length === 0) throw new Error("A completed session must contain trace events.");

  const first = session.events[0];
  const last = session.events.at(-1)!;
  const durationMs = Math.max(0, last.elapsedMs - first.elapsedMs);
  const attemptIds = session.events.filter((event) => event.code === "ATTEMPT_STARTED").map((event) => event.id);
  const safetyEvents = session.events.filter((event) => event.severity !== "info");
  const safetyIds = safetyEvents.map((event) => event.id);
  const allIds = session.events.map((event) => event.id);
  const score = scoreTrainingSession(session);

  return Object.freeze({
    sessionId: session.id,
    studentId: session.studentId,
    taskTitle: task.title,
    objective: task.objective,
    generatedAtLabel: `实训结束后生成 · T+${(last.elapsedMs / 1000).toFixed(2)}s`,
    dataNotice: SYNTHETIC_DATA_NOTICE,
    score,
    metrics: Object.freeze([
      Object.freeze({ label: "实训用时", value: `${(durationMs / 1000).toFixed(2)} s`, sourceEventIds: evidence([first.id, last.id], first.id) }),
      Object.freeze({ label: "操作尝试", value: `${attemptIds.length} 次`, sourceEventIds: evidence(attemptIds, first.id) }),
      Object.freeze({ label: "安全事件", value: `${safetyEvents.length} 项`, sourceEventIds: evidence(safetyIds, first.id) }),
      Object.freeze({ label: "综合得分", value: `${score.total} / 100`, sourceEventIds: evidence(allIds, first.id) }),
    ]),
    safetyEvents: Object.freeze(safetyEvents.map((event) => Object.freeze({
      id: event.id,
      code: event.findingCode ?? event.code,
      message: event.message ?? event.code,
      severity: event.severity,
    }))),
  });
}

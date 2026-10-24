export type TrainingSessionStatus = "completed" | "in-progress" | "needs-support";

export interface TrainingTask {
  readonly id: string;
  readonly title: string;
  readonly objective: string;
}

export interface TrainingStudent {
  readonly id: string;
  readonly name: string;
}

export interface TrainingSessionSummary {
  readonly id: string;
  readonly studentId: string;
  readonly taskId: string;
  readonly status: TrainingSessionStatus;
  readonly attempts: number;
  readonly safetyScore: number;
  readonly errorCodes: readonly string[];
}

export interface TrainingClass {
  readonly id: string;
  readonly name: string;
  readonly dataNotice: string;
  readonly students: readonly TrainingStudent[];
  readonly tasks: readonly TrainingTask[];
  readonly sessions: readonly TrainingSessionSummary[];
}

export interface ClassMetrics {
  readonly totalSessions: number;
  readonly completedSessions: number;
  readonly completionRate: number;
  readonly averageAttempts: number;
  readonly averageSafetyScore: number;
  readonly needsSupportCount: number;
}

export interface ErrorGroup {
  readonly code: string;
  readonly count: number;
}

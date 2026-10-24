export type TrainingEventCode =
  | "SESSION_STARTED"
  | "ATTEMPT_STARTED"
  | "TARGET_UPDATED"
  | "IK_SOLVED"
  | "IK_FAILED"
  | "TRAJECTORY_PREVIEWED"
  | "TRAJECTORY_PLAYED"
  | "SAFETY_BLOCKED"
  | "SINGULARITY_WARNING"
  | "RESET"
  | "SESSION_COMPLETED";

export type TrainingEventSeverity = "info" | "warning" | "blocked";

export interface TrainingEvent {
  readonly id: string;
  readonly sessionId: string;
  readonly sequence: number;
  readonly elapsedMs: number;
  readonly code: TrainingEventCode;
  readonly severity: TrainingEventSeverity;
  readonly message?: string;
  readonly jointSnapshot?: readonly number[];
  readonly findingCode?: string;
}

export interface TrainingSession {
  readonly id: string;
  readonly studentId: string;
  readonly taskId: string;
  readonly status: "active" | "completed";
  readonly events: readonly TrainingEvent[];
}

type TrainingEventInput = Omit<TrainingEvent, "sequence">;

function requireId(value: string, name: string): void {
  if (!value.trim()) throw new TypeError(`${name} must not be empty.`);
}

export function createTrainingSession(input: Pick<TrainingSession, "id" | "studentId" | "taskId">): TrainingSession {
  requireId(input.id, "Session id");
  requireId(input.studentId, "Student id");
  requireId(input.taskId, "Task id");
  return Object.freeze({ ...input, status: "active", events: Object.freeze([]) });
}

export function createTrainingEvent(input: TrainingEventInput): TrainingEvent {
  requireId(input.id, "Event id");
  requireId(input.sessionId, "Session id");
  if (!Number.isFinite(input.elapsedMs)) throw new TypeError("Event time must be finite.");
  if (input.elapsedMs < 0) throw new RangeError("Event time must not be negative.");
  let jointSnapshot: readonly number[] | undefined;
  if (input.jointSnapshot !== undefined) {
    if (input.jointSnapshot.length !== 6 || !input.jointSnapshot.every(Number.isFinite)) {
      throw new TypeError("Joint snapshot must contain six finite values.");
    }
    jointSnapshot = Object.freeze([...input.jointSnapshot]);
  }
  return Object.freeze({ ...input, sequence: 0, jointSnapshot });
}

export function appendTrainingEvent(session: TrainingSession, event: TrainingEvent): TrainingSession {
  if (session.status === "completed") throw new Error("Completed sessions are immutable.");
  if (event.sessionId !== session.id) throw new Error("Event session does not match the active session.");
  if (session.events.some((existing) => existing.id === event.id)) throw new Error("Duplicate event id.");
  const previous = session.events.at(-1);
  if (previous && event.elapsedMs < previous.elapsedMs) throw new Error("Event time is out of order.");
  const sequenced = Object.freeze({ ...event, sequence: session.events.length + 1 });
  return Object.freeze({ ...session, events: Object.freeze([...session.events, sequenced]) });
}

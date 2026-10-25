"use client";

import { create } from "zustand";
import type { SafetyReport } from "@/robotics/safety";
import {
  appendTrainingEvent,
  createTrainingEvent,
  createTrainingSession,
  type TrainingEventCode,
  type TrainingEventSeverity,
  type TrainingSession,
} from "@/training/events";

export interface RecordEventInput {
  readonly code: TrainingEventCode;
  readonly severity: TrainingEventSeverity;
  readonly elapsedMs: number;
  readonly message?: string;
  readonly jointSnapshot?: readonly number[];
  readonly findingCode?: string;
}

interface TrainingStoreState {
  session: TrainingSession | null;
  nextSessionId: number;
  nextEventId: number;
  startSession: (studentId: string, taskId: string) => string;
  recordEvent: (sessionId: string, event: RecordEventInput) => void;
  attachSafetyReport: (sessionId: string, report: SafetyReport, elapsedMs: number) => void;
  completeSession: (sessionId: string) => void;
  resetSession: () => void;
}

function eventCodeForFinding(code: SafetyReport["findings"][number]["code"]): TrainingEventCode {
  if (code === "SINGULARITY_RISK") return "SINGULARITY_WARNING";
  if (code === "IK_FAILURE") return "IK_FAILED";
  return "SAFETY_BLOCKED";
}

export const useTrainingStore = create<TrainingStoreState>((set, get) => ({
  session: null,
  nextSessionId: 1,
  nextEventId: 1,
  startSession: (studentId, taskId) => {
    const state = get();
    const id = `LIVE-SESSION-${state.nextSessionId}`;
    let session = createTrainingSession({ id, studentId, taskId });
    session = appendTrainingEvent(session, createTrainingEvent({
      id: `LIVE-EVENT-${state.nextEventId}`,
      sessionId: id,
      elapsedMs: 0,
      code: "SESSION_STARTED",
      severity: "info",
    }));
    set({ session, nextSessionId: state.nextSessionId + 1, nextEventId: state.nextEventId + 1 });
    return id;
  },
  recordEvent: (sessionId, input) => {
    const state = get();
    if (!state.session || state.session.id !== sessionId || state.session.status === "completed") return;
    const event = createTrainingEvent({
      ...input,
      id: `LIVE-EVENT-${state.nextEventId}`,
      sessionId,
    });
    set({ session: appendTrainingEvent(state.session, event), nextEventId: state.nextEventId + 1 });
  },
  attachSafetyReport: (sessionId, report, elapsedMs) => {
    for (const [index, finding] of report.findings.entries()) {
      get().recordEvent(sessionId, {
        code: eventCodeForFinding(finding.code),
        severity: finding.severity,
        elapsedMs: elapsedMs + index,
        message: finding.message,
        findingCode: finding.code,
      });
    }
  },
  completeSession: (sessionId) => {
    const state = get();
    if (!state.session || state.session.id !== sessionId || state.session.status === "completed") return;
    const lastTime = state.session.events.at(-1)?.elapsedMs ?? 0;
    const completed = appendTrainingEvent(state.session, createTrainingEvent({
      id: `LIVE-EVENT-${state.nextEventId}`,
      sessionId,
      elapsedMs: lastTime + 1,
      code: "SESSION_COMPLETED",
      severity: "info",
    }));
    set({ session: Object.freeze({ ...completed, status: "completed" }), nextEventId: state.nextEventId + 1 });
  },
  resetSession: () => set({ session: null }),
}));

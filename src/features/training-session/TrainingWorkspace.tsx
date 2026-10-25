"use client";

import { SYNTHETIC_DATA_NOTICE } from "@/training/synthetic-data";
import { useTrainingStore } from "./training-store";
import { EventTracePanel } from "./EventTracePanel";
import { TrainingTaskPanel } from "./TrainingTaskPanel";

export function TrainingWorkspace() {
  const session = useTrainingStore((state) => state.session);
  const startSession = useTrainingStore((state) => state.startSession);
  const completeSession = useTrainingStore((state) => state.completeSession);
  return <div className="training-workspace">
    <p className="synthetic-data-notice"><strong>数据边界</strong>{SYNTHETIC_DATA_NOTICE}</p>
    <TrainingTaskPanel session={session} onStart={() => startSession("SYN-001", "TASK-PATH")} onComplete={completeSession} />
    <EventTracePanel events={session?.events ?? []} />
  </div>;
}

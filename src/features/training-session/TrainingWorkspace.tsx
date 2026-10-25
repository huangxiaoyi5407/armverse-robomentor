"use client";

import { ReportActions } from "@/features/training-report/ReportActions";
import { TrainingReport } from "@/features/training-report/TrainingReport";
import { buildTrainingReport } from "@/training/report";
import { SYNTHETIC_CLASS, SYNTHETIC_DATA_NOTICE } from "@/training/synthetic-data";
import { useTrainingStore } from "./training-store";
import { EventTracePanel } from "./EventTracePanel";
import { TrainingTaskPanel } from "./TrainingTaskPanel";

export function TrainingWorkspace() {
  const session = useTrainingStore((state) => state.session);
  const startSession = useTrainingStore((state) => state.startSession);
  const completeSession = useTrainingStore((state) => state.completeSession);
  const task = SYNTHETIC_CLASS.tasks.find((candidate) => candidate.id === "TASK-PATH")!;
  const report = session?.status === "completed" ? buildTrainingReport(session, task) : null;
  return <div className="training-workspace">
    <p className="synthetic-data-notice"><strong>数据边界</strong>{SYNTHETIC_DATA_NOTICE}</p>
    <TrainingTaskPanel session={session} onStart={() => startSession("SYN-001", "TASK-PATH")} onComplete={completeSession} />
    <EventTracePanel events={session?.events ?? []} />
    {report && <TrainingReport report={report} />}
    <ReportActions report={report} />
  </div>;
}

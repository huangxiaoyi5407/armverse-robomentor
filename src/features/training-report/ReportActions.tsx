"use client";

import type { TrainingReportModel } from "@/training/report";

export function ReportActions({ report }: { readonly report: TrainingReportModel | null }) {
  return <div className="training-report-actions">
    <button type="button" disabled={!report} onClick={() => report && window.print()}>打印或导出 PDF</button>
  </div>;
}

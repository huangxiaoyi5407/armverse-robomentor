import type { TrainingReportModel } from "@/training/report";

export function TrainingReport({ report }: { readonly report: TrainingReportModel }) {
  return <section className="training-report" aria-label="实训报告">
    <header className="training-report__header">
      <div><span className="eyebrow">TRACEABLE REPORT</span><h2>实训报告</h2></div>
      <strong className="training-report__score">{report.score.total}<small>分</small></strong>
    </header>
    <p>{report.taskTitle} · {report.studentId}</p>
    <p>{report.objective}</p>
    <div className="training-report__metrics">
      {report.metrics.map((metric) => <article key={metric.label}>
        <span>{metric.label}</span><strong>{metric.value}</strong>
        <small>证据：{metric.sourceEventIds.join("、")}</small>
      </article>)}
    </div>
    <div className="training-report__findings">
      <h3>安全校验记录</h3>
      {report.safetyEvents.length === 0
        ? <p>未记录警告或阻断事件。</p>
        : report.safetyEvents.map((event) => <article key={event.id}>
          <strong>{event.code}</strong><span>{event.message}</span><small>证据：{event.id}</small>
        </article>)}
    </div>
    <footer><span>{report.generatedAtLabel}</span><span>{report.dataNotice}</span></footer>
  </section>;
}

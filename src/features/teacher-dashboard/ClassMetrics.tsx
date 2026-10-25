import type { ClassMetrics as ClassMetricsModel } from "@/training/types";

export function ClassMetrics({ metrics }: { readonly metrics: ClassMetricsModel }) {
  const items = [
    ["实训记录", `${metrics.totalSessions} 次`],
    ["完成率", `${(metrics.completionRate * 100).toFixed(1)}%`],
    ["平均尝试", `${metrics.averageAttempts.toFixed(1)} 次`],
    ["平均安全得分", `${metrics.averageSafetyScore.toFixed(1)} 分`],
    ["需关注", `${metrics.needsSupportCount} 次`],
  ] as const;
  return <section className="class-metrics" aria-label="班级实训指标">
    {items.map(([label, value]) => <article key={label}>
      <span>{label}</span><strong>{value}</strong>
    </article>)}
  </section>;
}

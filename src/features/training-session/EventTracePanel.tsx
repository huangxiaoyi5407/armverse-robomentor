"use client";

import { useState } from "react";
import type { TrainingEvent, TrainingEventSeverity } from "@/training/events";

const GUIDANCE: Partial<Record<string, { reason: string; correction: string }>> = {
  OBSTACLE_COLLISION: {
    reason: "轨迹进入设备禁入区，确定性安全门已阻断执行。",
    correction: "缩小路径范围或调整中间路径点后重新规划。",
  },
  SINGULARITY_RISK: {
    reason: "雅可比矩阵接近奇异状态，末端速度可能放大关节速度。",
    correction: "调整末端姿态或更换初始关节配置，远离奇异区域。",
  },
  IK_FAILURE: {
    reason: "目标位姿未在当前约束和迭代上限内得到有效逆解。",
    correction: "将目标移回工作空间，或从更接近目标的姿态重新求解。",
  },
};

const LABELS: Record<TrainingEventSeverity, string> = { info: "记录", warning: "警告", blocked: "阻断" };

export function EventTracePanel({ events }: { events: readonly TrainingEvent[] }) {
  const [filter, setFilter] = useState<"all" | TrainingEventSeverity>("all");
  const visible = filter === "all" ? events : events.filter((event) => event.severity === filter);
  return <section className="event-trace-panel" aria-label="错误操作溯源">
    <div className="trace-heading"><div><p className="panel-kicker">操作证据链</p><h2>错误操作溯源</h2></div><label>筛选事件<select aria-label="筛选事件" value={filter} onChange={(event) => setFilter(event.currentTarget.value as "all" | TrainingEventSeverity)}><option value="all">全部</option><option value="info">记录</option><option value="warning">警告</option><option value="blocked">阻断</option></select></label></div>
    {visible.length === 0 ? <p className="trace-empty">当前筛选条件下没有事件。开始实训后，操作和安全判断会按顺序记录。</p> : <ol className="event-trace">{visible.map((event) => {
      const guide = event.findingCode ? GUIDANCE[event.findingCode] : undefined;
      return <li key={event.id} className={event.severity}>
        <span className="trace-sequence">{String(event.sequence).padStart(2, "0")}</span>
        <div><div className="trace-code"><strong>{event.code}</strong><span>{LABELS[event.severity]} · {(event.elapsedMs / 1000).toFixed(2)}s</span></div>
          {event.code === "SESSION_STARTED" ? <p>实训会话已开始</p> : null}
          {event.message ? <p>{event.message}</p> : null}
          {guide ? <div className="trace-guidance"><p><b>原因</b>{guide.reason}</p><p><b>修正</b>{guide.correction}</p></div> : null}
        </div>
      </li>;
    })}</ol>}
  </section>;
}

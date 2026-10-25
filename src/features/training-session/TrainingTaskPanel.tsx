"use client";

import type { TrainingSession } from "@/training/events";

const STEPS = Object.freeze([
  "确认取料区、检测区与放料区坐标",
  "规划可达且连续的机械臂轨迹",
  "通过限位、碰撞与奇异性安全校验",
  "执行轨迹并检查末端到位状态",
]);

export function TrainingTaskPanel({ session, onStart, onComplete }: {
  session: TrainingSession | null;
  onStart: () => void;
  onComplete: (sessionId: string) => void;
}) {
  return <section className="training-task-panel" aria-label="综合实训任务">
    <div className="training-task-heading">
      <div><p className="panel-kicker">柔性制造综合实验</p><h2>柔性产线轨迹规划与安全控制</h2></div>
      <p role="status" aria-label="实训状态" className={`training-status ${session?.status ?? "idle"}`}>
        {session?.status === "completed" ? "已完成" : session ? "进行中" : "未开始"}
      </p>
    </div>
    <p className="objective">控制 UR5 完成取料、检测和放料流程，并保证整条轨迹满足工作空间、关节限位、碰撞与奇异性约束。</p>
    <ol className="training-route">{STEPS.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>
    {!session ? <button type="button" className="training-primary" onClick={onStart}>开始综合实训</button> : null}
    {session?.status === "active" ? <button type="button" className="training-primary" onClick={() => onComplete(session.id)}>完成本次实训</button> : null}
  </section>;
}

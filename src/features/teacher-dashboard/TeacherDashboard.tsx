"use client";

import { useMemo, useState } from "react";
import { calculateClassMetrics, groupTrainingErrors } from "@/training/analytics";
import type { TrainingClass, TrainingSessionSummary } from "@/training/types";
import { ClassMetrics } from "./ClassMetrics";
import { ErrorDistribution } from "./ErrorDistribution";

const STATUS_LABELS = { completed: "已完成", "in-progress": "进行中", "needs-support": "需关注" } as const;

export function TeacherDashboard({ trainingClass }: { readonly trainingClass: TrainingClass }) {
  const metrics = useMemo(() => calculateClassMetrics(trainingClass.sessions), [trainingClass.sessions]);
  const errorGroups = useMemo(() => groupTrainingErrors(trainingClass.sessions), [trainingClass.sessions]);
  const supportSessions = useMemo(() => trainingClass.sessions.filter((session) => session.status === "needs-support"), [trainingClass.sessions]);
  const [selected, setSelected] = useState<TrainingSessionSummary | null>(null);
  const student = selected ? trainingClass.students.find((item) => item.id === selected.studentId) : null;
  const task = selected ? trainingClass.tasks.find((item) => item.id === selected.taskId) : null;
  const evidenceIds = selected ? [
    `${selected.studentId}-E1`,
    ...selected.errorCodes.map((_, index) => `${selected.studentId}-E${index + 2}`),
    `${selected.studentId}-E${selected.errorCodes.length + 2}`,
  ] : [];

  return <section className="teacher-dashboard" aria-label="教师工作台">
    <header className="teacher-dashboard__header">
      <div><p className="panel-kicker">班级实训总览</p><h2>{trainingClass.name}</h2><p>从完成率、安全得分和错误类型定位需要讲解的知识点。</p></div>
      <p className="synthetic-data-notice"><strong>数据边界</strong>{trainingClass.dataNotice}</p>
    </header>
    <ClassMetrics metrics={metrics} />
    <div className="teacher-dashboard__grid">
      <ErrorDistribution groups={errorGroups} />
      <section className="support-sessions" aria-label="需关注会话">
        <div className="teacher-section-heading"><div><h2>需关注会话</h2><p>按确定性规则筛出的合成样例</p></div><span>{supportSessions.length} 条</span></div>
        <ul>{supportSessions.map((session) => {
          const sessionStudent = trainingClass.students.find((item) => item.id === session.studentId);
          const sessionTask = trainingClass.tasks.find((item) => item.id === session.taskId);
          return <li key={session.id}>
            <div><strong>{sessionStudent?.name}</strong><span>{sessionTask?.title}</span></div>
            <button type="button" aria-label={`查看会话 ${session.id}`} onClick={() => setSelected(session)}>查看</button>
          </li>;
        })}</ul>
      </section>
    </div>
    <section className="session-drilldown" aria-label="会话详情">
      {selected ? <>
        <div className="teacher-section-heading"><div><h2>{student?.name}</h2><p>{task?.title}</p></div><span>{STATUS_LABELS[selected.status]}</span></div>
        <dl><div><dt>会话编号</dt><dd>{selected.id}</dd></div><div><dt>尝试次数</dt><dd>{selected.attempts} 次</dd></div><div><dt>安全得分</dt><dd>{selected.safetyScore} 分</dd></div><div><dt>错误代码</dt><dd>{selected.errorCodes.join("、") || "无"}</dd></div></dl>
        <div className="drilldown-evidence">
          <section className="synthetic-timeline" aria-label="合成事件时间线">
            <h3>事件时间线</h3>
            <ol>
              <li><span>{evidenceIds[0]}</span><strong>SESSION_STARTED</strong><p>合成实训会话开始</p></li>
              {selected.errorCodes.map((code, index) => <li key={code}><span>{evidenceIds[index + 1]}</span><strong>{code}</strong><p>固定样例中记录的安全或求解事件</p></li>)}
              <li><span>{evidenceIds.at(-1)}</span><strong>SESSION_REQUIRES_SUPPORT</strong><p>根据状态规则进入需关注列表</p></li>
            </ol>
          </section>
          <section className="synthetic-report" aria-label="合成会话报告">
            <h3>报告摘要</h3>
            <div><span>任务</span><strong>{task?.title}</strong></div>
            <div><span>尝试</span><strong>{selected.attempts} 次</strong></div>
            <div><span>安全得分</span><strong>{selected.safetyScore} 分</strong></div>
            <p>证据：{evidenceIds.join("、")}</p>
            <small>{trainingClass.dataNotice}</small>
          </section>
        </div>
      </> : <div className="session-drilldown__empty"><h2>会话详情</h2><p>选择一条需关注会话，查看任务、尝试次数和安全得分。</p></div>}
    </section>
  </section>;
}

"use client";

import { useState } from "react";
import { MatrixPanel } from "@/features/control-panel/MatrixPanel";
import { TelemetryPanel } from "@/features/control-panel/TelemetryPanel";
import { WorkflowPanel } from "@/features/agent-workflow/WorkflowPanel";
import type { WorkflowResult } from "@/ai/workflow";
import { ExperimentPanel } from "@/features/lessons/ExperimentPanel";
import { LESSONS } from "@/features/lessons/lesson-data";
import { changeLesson, LessonPanel } from "@/features/lessons/LessonPanel";
import type { Lesson } from "@/features/lessons/lesson-types";
import { RobotScene } from "@/features/simulator/RobotScene";
import { useSimulationStore } from "@/features/simulator/store";
import { TrainingWorkspace } from "@/features/training-session/TrainingWorkspace";
import { useTrainingStore, type RecordEventInput } from "@/features/training-session/training-store";
import { TeacherDashboard } from "@/features/teacher-dashboard/TeacherDashboard";
import { SYNTHETIC_CLASS } from "@/training/synthetic-data";
import { PIDLab } from "@/features/control-lab/PIDLab";
import { IntegrationPanel } from "@/features/integration-lab/IntegrationPanel";

export default function HomePage() {
  const [activeLesson, setActiveLesson] = useState(LESSONS[0]);
  const [workspace, setWorkspace] = useState<"lessons" | "training" | "control" | "integration">("lessons");
  const [audience, setAudience] = useState<"student" | "teacher">("student");
  const cancel = useSimulationStore((state) => state.cancel);
  const setJoint = useSimulationStore((state) => state.setJoint);
  const selectLesson = (lesson: Lesson) => {
    changeLesson(lesson, cancel, (values) => values.forEach((value, index) => setJoint(index, value)));
    setActiveLesson(lesson);
  };
  const recordTrainingEvent = (event: RecordEventInput) => {
    const state = useTrainingStore.getState();
    if (!state.session || state.session.status === "completed") return;
    const elapsedMs = (state.session.events.at(-1)?.elapsedMs ?? 0) + 1;
    state.recordEvent(state.session.id, { ...event, elapsedMs });
  };
  const recordWorkflowResult = (result: WorkflowResult) => {
    const state = useTrainingStore.getState();
    if (!state.session || state.session.status === "completed") return;
    const elapsedMs = (state.session.events.at(-1)?.elapsedMs ?? 0) + 1;
    state.attachSafetyReport(state.session.id, result.safety, elapsedMs);
    if (result.outcome === "ready") recordTrainingEvent({ code: "TRAJECTORY_PLAYED", severity: "info", elapsedMs });
  };
  return <main className="lab-shell">
    <header className="lab-header"><div><p className="eyebrow">ARMVERSE · AUTOMATION DIGITAL TWIN LAB · UR5</p><h1>臂境智教</h1></div><p role="status" aria-label="运行模式" className="mode-status"><span />Demo 演示模式 · 无需 AI 密钥</p></header>
    <nav className="audience-switch" aria-label="使用角色"><button type="button" aria-pressed={audience === "student"} onClick={() => setAudience("student")}>学生实验台</button><button type="button" aria-pressed={audience === "teacher"} onClick={() => setAudience("teacher")}>教师工作台</button></nav>
    {audience === "student" ? <>
      <nav className="workspace-switch" aria-label="实验工作区"><button type="button" aria-pressed={workspace === "lessons"} onClick={() => setWorkspace("lessons")}>课程实验</button><button type="button" aria-pressed={workspace === "training"} onClick={() => setWorkspace("training")}>综合实训</button><button type="button" aria-pressed={workspace === "control"} onClick={() => setWorkspace("control")}>PID 控制实验</button><button type="button" aria-pressed={workspace === "integration"} onClick={() => setWorkspace("integration")}>工业接口实验</button><p>{workspace === "lessons" ? "七章原理实验" : workspace === "training" ? "柔性制造任务 · 过程可追溯" : workspace === "control" ? "单关节闭环 · 参数可调" : "ROS 2 JSON · 网关状态机"}</p></nav>
      {workspace === "control" ? <PIDLab /> : workspace === "integration" ? <IntegrationPanel /> : <div className="workbench">
      <LessonPanel lessons={LESSONS} activeId={activeLesson.id} onSelect={selectLesson} />
      <div className="simulation-column"><RobotScene onTrainingEvent={workspace === "training" ? recordTrainingEvent : undefined} />{workspace === "lessons" ? <ExperimentPanel lesson={activeLesson} /> : <TrainingWorkspace />}<WorkflowPanel onTrainingResult={workspace === "training" ? recordWorkflowResult : undefined} /></div>
      <aside className="instrument-rack" aria-label="数据仪表架"><TelemetryPanel /><MatrixPanel /></aside>
      </div>}
    </> : <TeacherDashboard trainingClass={SYNTHETIC_CLASS} />}
    <footer className="lab-footer"><span>确定性运动学内核</span><span>SI 单位制</span><span>安全优先执行链</span></footer>
  </main>;
}

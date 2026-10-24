"use client";

import { useState } from "react";
import { MatrixPanel } from "@/features/control-panel/MatrixPanel";
import { TelemetryPanel } from "@/features/control-panel/TelemetryPanel";
import { WorkflowPanel } from "@/features/agent-workflow/WorkflowPanel";
import { ExperimentPanel } from "@/features/lessons/ExperimentPanel";
import { LESSONS } from "@/features/lessons/lesson-data";
import { changeLesson, LessonPanel } from "@/features/lessons/LessonPanel";
import type { Lesson } from "@/features/lessons/lesson-types";
import { RobotScene } from "@/features/simulator/RobotScene";
import { useSimulationStore } from "@/features/simulator/store";

export default function HomePage() {
  const [activeLesson, setActiveLesson] = useState(LESSONS[0]);
  const cancel = useSimulationStore((state) => state.cancel);
  const setJoint = useSimulationStore((state) => state.setJoint);
  const selectLesson = (lesson: Lesson) => {
    changeLesson(lesson, cancel, (values) => values.forEach((value, index) => setJoint(index, value)));
    setActiveLesson(lesson);
  };
  return <main className="lab-shell">
    <header className="lab-header"><div><p className="eyebrow">ARMVERSE · AUTOMATION DIGITAL TWIN LAB · UR5</p><h1>臂境智教</h1></div><p role="status" aria-label="运行模式" className="mode-status"><span />Demo 演示模式 · 无需 AI 密钥</p></header>
    <div className="workbench">
      <LessonPanel lessons={LESSONS} activeId={activeLesson.id} onSelect={selectLesson} />
      <div className="simulation-column"><RobotScene /><ExperimentPanel lesson={activeLesson} /><WorkflowPanel /></div>
      <aside className="instrument-rack" aria-label="数据仪表架"><TelemetryPanel /><MatrixPanel /></aside>
    </div>
    <footer className="lab-footer"><span>确定性运动学内核</span><span>SI 单位制</span><span>安全优先执行链</span></footer>
  </main>;
}

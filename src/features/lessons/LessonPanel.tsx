"use client";

import type { JointVector } from "@/robotics/types";
import type { Lesson } from "./lesson-types";

export function changeLesson(
  lesson: Lesson,
  cancel: () => void,
  reset: (joints: JointVector) => void,
) {
  cancel();
  reset(lesson.resetJoints);
}

export function LessonPanel({ lessons, activeId, onSelect }: {
  lessons: readonly Lesson[];
  activeId: string;
  onSelect: (lesson: Lesson) => void;
}) {
  return (
    <nav className="lesson-nav" aria-label="课程章节">
      <p className="panel-kicker">LEARNING PATH</p>
      <h2>七章实验路线</h2>
      <div className="lesson-list">
        {lessons.map((item) => (
          <button key={item.id} type="button" className={item.id === activeId ? "lesson-button active" : "lesson-button"} aria-pressed={item.id === activeId} onClick={() => onSelect(item)}>
            <span>第{item.chapter}章</span><strong>{item.title}</strong>
          </button>
        ))}
      </div>
    </nav>
  );
}

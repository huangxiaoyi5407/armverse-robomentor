import type { Lesson } from "./lesson-types";

export function ExperimentPanel({ lesson }: { lesson: Lesson }) {
  return (
    <section className="experiment-panel" aria-label="实验步骤">
      <header><p className="panel-kicker">CHAPTER {String(lesson.chapter).padStart(2, "0")}</p><h2>{lesson.title}</h2></header>
      <p className="objective">{lesson.objective}</p>
      <div className="concept-strip"><strong>核心原理</strong><span>{lesson.concept}</span></div>
      <div className="experiment-columns">
        <div><h3>操作步骤</h3><ol>{lesson.steps.map((step) => <li key={step}>{step}</li>)}</ol></div>
        <div><h3>观察问题</h3><ul>{lesson.observationPrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ul></div>
        <div><h3>达成标准</h3><ul>{lesson.successChecks.map((check) => <li key={check}>{check}</li>)}</ul></div>
      </div>
    </section>
  );
}

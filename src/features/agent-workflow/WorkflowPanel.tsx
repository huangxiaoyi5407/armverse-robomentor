"use client";

import { useRef, useState, type FormEvent } from "react";
import { useStore } from "zustand";
import { AgentResponseSchema, type AgentRequest } from "@/ai/schemas";
import type { AIProvider } from "@/ai/providers/types";
import { runTeachingWorkflow, type WorkflowResult } from "@/ai/workflow";
import { useSimulationStore } from "@/features/simulator/store";
import { workflowStore } from "./workflow-store";

const httpProvider: AIProvider = { async run(request: AgentRequest, signal: AbortSignal) {
  const response = await fetch("/api/agent", { method: "POST", signal, headers: { "content-type": "application/json" }, body: JSON.stringify(request) });
  if (!response.ok) throw new Error("Agent 服务暂时不可用");
  return AgentResponseSchema.parse(await response.json());
} };

export function WorkflowPanel({ onTrainingResult }: { onTrainingResult?: (result: WorkflowResult) => void } = {}) {
  const [command, setCommand] = useState("将机械臂移动到安全教学姿态，并解释运动学变化");
  const [challengeObstacle, setChallengeObstacle] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const { running, timeline, summary } = useStore(workflowStore);
  const joints = useSimulationStore((state) => state.joints);
  const previewTrajectory = useSimulationStore((state) => state.previewTrajectory);
  const playTrajectory = useSimulationStore((state) => state.play);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    controller.current?.abort();
    controller.current = new AbortController();
    const operationId = workflowStore.getState().begin(command);
    try {
      const obstacles = challengeObstacle ? [{ id: "教学安全挑战区", min: [-1, -1, -1] as const, max: [1, 1, 1] as const }] : [];
      const result = await runTeachingWorkflow(command, { joints, environment: { obstacles } }, { provider: httpProvider, onTransition: (entry) => workflowStore.getState().append(operationId, entry) }, controller.current.signal);
      if (result.trajectory) {
        const simulationOperationId = previewTrajectory(result.trajectory, result.safety);
        playTrajectory(simulationOperationId);
      }
      onTrainingResult?.(result);
      workflowStore.getState().complete(operationId, { outcome: result.outcome, label: result.modeLabel });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) workflowStore.getState().fail(operationId, "工作流失败，请重试或继续使用手动实验。 ");
    }
  };

  return <section className="workflow-panel" aria-label="三 Agent 教学工作流">
    <div className="workflow-intro"><p className="panel-kicker">THREE-AGENT PIPELINE</p><h2>智能任务协同台</h2><p>规划提出动作，安全内核拥有否决权，教学 Agent 解释真实结果。</p></div>
    <form className="command-form" onSubmit={submit}><label htmlFor="agent-command">实验指令</label><div><input id="agent-command" value={command} onChange={(event) => setCommand(event.currentTarget.value)} maxLength={500} required /><button type="submit" disabled={running}>{running ? "协同处理中…" : "启动三 Agent"}</button></div><label className="challenge-toggle"><input type="checkbox" checked={challengeObstacle} onChange={(event) => setChallengeObstacle(event.currentTarget.checked)} />启用安全挑战障碍物</label></form>
    <div className="workflow-timeline" aria-live="polite">
      {timeline.length === 0 ? <p className="timeline-empty">输入目标后，这里会展示每个 Agent 与确定性安全门的工作证据。</p> : timeline.map((entry, index) => <div className={`timeline-step ${entry.state}`} key={`${index}-${entry.state}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{entry.state.toUpperCase()}</strong><p>{entry.message}</p></div></div>)}
    </div>
    {summary ? <p className={`workflow-summary ${summary.outcome}`} role="status">{summary.label} · {summary.outcome === "ready" ? "安全轨迹已自动开始播放" : "危险轨迹已阻断"}</p> : null}
  </section>;
}

import type { AIProvider } from "@/ai/providers/types";
import { requestPlan } from "@/ai/planner";
import { requestSafetyExplanation } from "@/ai/reviewer";
import { requestTutorExplanation } from "@/ai/tutor";
import { validateTrajectory, type SafetyEnvironment, type SafetyReport } from "@/robotics/safety";
import { planCartesianLine, planJointTrajectory, type Trajectory } from "@/robotics/trajectory";
import type { JointVector } from "@/robotics/types";
import { UR5_MODEL } from "@/robotics/ur5-model";

export type WorkflowState = "planning" | "validating" | "reviewing" | "executing" | "blocked" | "explaining" | "complete" | "failed";
export interface WorkflowEvent { readonly state: WorkflowState; readonly message: string; }
export interface WorkflowSnapshot { readonly joints: JointVector; readonly environment: SafetyEnvironment; }
export interface WorkflowDependencies { readonly provider: AIProvider; readonly onTransition?: (event: WorkflowEvent) => void; }
export interface WorkflowResult { readonly outcome: "ready" | "blocked"; readonly trajectory: Trajectory | null; readonly safety: SafetyReport; readonly timeline: readonly WorkflowEvent[]; readonly modeLabel: string; readonly tutor: unknown; }

function abortIfNeeded(signal: AbortSignal) { if (signal.aborted) throw new DOMException("The operation was aborted.", "AbortError"); }

export async function runTeachingWorkflow(command: string, snapshot: WorkflowSnapshot, dependencies: WorkflowDependencies, signal: AbortSignal): Promise<WorkflowResult> {
  abortIfNeeded(signal);
  const timeline: WorkflowEvent[] = [];
  const transition = (state: WorkflowState, message: string) => { const event = Object.freeze({ state, message }); timeline.push(event); dependencies.onTransition?.(event); };
  transition("planning", "规划 Agent 正在将目标转换为受约束动作");
  const planned = await requestPlan(dependencies.provider, command, signal);
  abortIfNeeded(signal);
  let trajectory: Trajectory;
  if (planned.plan.action === "move_pose") {
    const result = planCartesianLine(UR5_MODEL, snapshot.joints, { position: planned.plan.position, orientation: planned.plan.orientation }, { duration: 3, sampleCount: 31 });
    if (result.status === "failed") trajectory = planJointTrajectory(snapshot.joints, snapshot.joints, { duration: 1, sampleCount: 2, mode: "cubic" });
    else trajectory = result.trajectory;
  } else {
    const target = planned.plan.action === "move_joints" ? planned.plan.joints : snapshot.joints;
    trajectory = planJointTrajectory(snapshot.joints, target, { duration: 3, sampleCount: 31, mode: "quintic" });
  }
  transition("validating", planned.fallback ? "规划输出无效，已采用安全 Demo 回退并进行确定性校验" : "确定性内核正在检查限位、工作空间、碰撞与奇异性");
  const safety = validateTrajectory(UR5_MODEL, trajectory, snapshot.environment);
  transition("reviewing", "安全 Agent 正在解释确定性校验结果");
  await requestSafetyExplanation(dependencies.provider, safety, signal);
  const approved = safety.approvedTrajectory;
  transition(approved ? "executing" : "blocked", approved ? "轨迹已通过安全门，可进入仿真预览" : "确定性安全门已阻断轨迹");
  transition("explaining", "教学 Agent 正在根据真实检测结果生成讲解");
  const tutor = await requestTutorExplanation(dependencies.provider, command, safety, signal);
  transition("complete", approved ? "教学工作流完成，等待用户播放" : "教学工作流完成，危险动作未执行");
  return Object.freeze({ outcome: approved ? "ready" : "blocked", trajectory: approved, safety, timeline: Object.freeze(timeline), modeLabel: planned.label, tutor });
}

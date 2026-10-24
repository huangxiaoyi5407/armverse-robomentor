import type { AgentRequest, AgentResponse } from "@/ai/schemas";
import type { AIProvider } from "./types";

function abortError() { return new DOMException("The operation was aborted.", "AbortError"); }

export class DemoProvider implements AIProvider {
  async run(request: AgentRequest, signal: AbortSignal): Promise<AgentResponse> {
    if (signal.aborted) throw abortError();
    const base = { agent: request.agent, mode: "demo" as const, label: "Demo 演示模式 · 确定性示例" };
    if (request.agent === "planner") return { ...base, result: { action: "move_joints", joints: [0.4, -0.9, 1.1, -0.5, 0.7, 0], rationale: "使用已验证的教学姿态展示规划流程。" } };
    if (request.agent === "safety") return { ...base, result: { verdict: "approved", findings: [], explanation: "演示姿态仍需经过确定性限位、速度与碰撞检测。" } };
    return { ...base, result: { title: "自动化实验提示", explanation: "观察关节变量如何经运动学链映射为末端位姿，再用数值遥测验证判断。", questions: ["哪个关节对当前末端位置影响最大？"] } };
  }
}

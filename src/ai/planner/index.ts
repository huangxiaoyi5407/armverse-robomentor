import { AgentPlanSchema, type AgentPlan } from "@/ai/schemas";
import { DemoProvider } from "@/ai/providers/demo-provider";
import type { AIProvider } from "@/ai/providers/types";

export async function requestPlan(provider: AIProvider, command: string, signal: AbortSignal): Promise<{ plan: AgentPlan; mode: "demo" | "online"; label: string; fallback: boolean }> {
  try {
    const response = await provider.run({ agent: "planner", prompt: command }, signal);
    return { plan: AgentPlanSchema.parse(response.result), mode: response.mode, label: response.label, fallback: false };
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) throw error;
    const fallback = await new DemoProvider().run({ agent: "planner", prompt: "使用安全教学姿态" }, signal);
    return { plan: AgentPlanSchema.parse(fallback.result), mode: "demo", label: "Demo 演示模式 · 规划回退", fallback: true };
  }
}

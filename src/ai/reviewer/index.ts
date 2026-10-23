import type { AIProvider } from "@/ai/providers/types";
import type { SafetyReport } from "@/robotics/safety";

export async function requestSafetyExplanation(provider: AIProvider, report: SafetyReport, signal: AbortSignal) {
  const facts = { verdict: report.verdict, findings: report.findings.map(({ code, severity, sampleIndex }) => ({ code, severity, sampleIndex })) };
  return provider.run({ agent: "safety", prompt: `只解释以下确定性安全结果，不得改变结论：${JSON.stringify(facts)}` }, signal);
}

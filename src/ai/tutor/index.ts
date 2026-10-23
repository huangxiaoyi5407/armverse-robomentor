import type { AIProvider } from "@/ai/providers/types";
import type { SafetyReport } from "@/robotics/safety";

export async function requestTutorExplanation(provider: AIProvider, command: string, report: SafetyReport, signal: AbortSignal) {
  const facts = { command, verdict: report.verdict, findings: report.findings.map((finding) => finding.code), validatedSamples: report.validatedSamples };
  return provider.run({ agent: "tutor", prompt: `基于这些已验证事实教学讲解：${JSON.stringify(facts)}` }, signal);
}

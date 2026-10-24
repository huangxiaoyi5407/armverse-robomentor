import { AgentResponseSchema, type AgentRequest, type AgentResponse } from "@/ai/schemas";
import type { AIProvider, ProviderEnvironment } from "./types";

export class OnlineProvider implements AIProvider {
  constructor(private readonly environment: ProviderEnvironment) {}

  async run(request: AgentRequest, signal: AbortSignal): Promise<AgentResponse> {
    if (signal.aborted) throw new DOMException("The operation was aborted.", "AbortError");
    const endpoint = `${(this.environment.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(endpoint, { method: "POST", signal, headers: { "content-type": "application/json", authorization: `Bearer ${this.environment.AI_API_KEY}` }, body: JSON.stringify({ model: this.environment.AI_MODEL ?? "gpt-4o-mini", response_format: { type: "json_object" }, messages: [{ role: "system", content: "Return only a JSON object matching the requested ArmVerse teaching-agent schema. Never emit code or executable commands." }, { role: "user", content: JSON.stringify(request) }] }) });
      if (response.status === 429 && attempt === 0) continue;
      if (!response.ok) throw new Error(`AI provider request failed (${response.status}).`);
      const payload: unknown = await response.json();
      const content = typeof payload === "object" && payload !== null && "choices" in payload
        ? (payload as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content
        : payload;
      const candidate = typeof content === "string" ? JSON.parse(content) : content;
      return AgentResponseSchema.parse({ ...(candidate as object), mode: "online", label: "在线 AI 模式" });
    }
    throw new Error("AI provider rate limit persisted after one retry.");
  }
}

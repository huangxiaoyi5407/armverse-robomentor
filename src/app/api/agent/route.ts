import { AgentRequestSchema, AgentResponseSchema } from "@/ai/schemas";
import { getProvider } from "@/ai/providers/provider-router";

const DEADLINE_MS = 15_000;

export async function POST(request: Request) {
  try {
    const parsed = AgentRequestSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "请求格式无效" }, { status: 400 });
    const timeout = AbortSignal.timeout(DEADLINE_MS);
    const signal = AbortSignal.any([request.signal, timeout]);
    const provider = getProvider({ AI_API_KEY: process.env.AI_API_KEY, AI_BASE_URL: process.env.AI_BASE_URL, AI_MODEL: process.env.AI_MODEL });
    const response = AgentResponseSchema.parse(await provider.run(parsed.data, signal));
    return Response.json(response);
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return Response.json({ error: timedOut ? "AI 服务响应超时" : "AI 服务暂时不可用" }, { status: timedOut ? 504 : 502 });
  }
}

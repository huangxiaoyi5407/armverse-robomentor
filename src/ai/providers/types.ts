import type { AgentRequest, AgentResponse } from "@/ai/schemas";

export interface AIProvider { run(request: AgentRequest, signal: AbortSignal): Promise<AgentResponse>; }
export interface ProviderEnvironment { readonly AI_API_KEY?: string; readonly AI_BASE_URL?: string; readonly AI_MODEL?: string; }

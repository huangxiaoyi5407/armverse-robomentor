import type { AIProvider, ProviderEnvironment } from "./types";
import { DemoProvider } from "./demo-provider";
import { OnlineProvider } from "./online-provider";

export function getProvider(environment: ProviderEnvironment): AIProvider {
  const demo = new DemoProvider();
  if (!environment.AI_API_KEY) return demo;
  const online = new OnlineProvider(environment);
  return { async run(request, signal) {
    try { return await online.run(request, signal); }
    catch (error) {
      if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) throw error;
      return demo.run(request, signal);
    }
  } };
}

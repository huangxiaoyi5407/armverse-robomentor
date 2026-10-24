import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DemoProvider } from "@/ai/providers/demo-provider";
import type { AgentRequest } from "@/ai/schemas";
import { useSimulationStore } from "@/features/simulator/store";
import { WorkflowPanel } from "./WorkflowPanel";

describe("WorkflowPanel", () => {
  beforeEach(() => {
    useSimulationStore.getState().reset();
    const provider = new DemoProvider();
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as AgentRequest;
      const result = await provider.run(request, init?.signal ?? new AbortController().signal);
      return new Response(JSON.stringify(result), { status: 200 });
    }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("automatically plays an approved three-agent trajectory", async () => {
    render(<WorkflowPanel />);

    fireEvent.click(screen.getByRole("button", { name: "启动三 Agent" }));

    await waitFor(() => expect(useSimulationStore.getState().status).toBe("playing"));
    expect(screen.getByRole("status")).toHaveTextContent("安全轨迹已自动开始播放");
  });
});

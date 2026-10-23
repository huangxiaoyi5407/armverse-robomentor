import { describe, expect, it } from "vitest";
import { createWorkflowStore } from "./workflow-store";

describe("workflow UI state", () => {
  it("ignores a stale workflow response after a newer command starts", () => {
    const store = createWorkflowStore();
    const first = store.getState().begin("first");
    const second = store.getState().begin("second");
    store.getState().complete(first, { outcome: "ready", label: "old" });
    expect(store.getState().command).toBe("second");
    expect(store.getState().operationId).toBe(second);
    expect(store.getState().summary).toBeNull();
    store.getState().complete(second, { outcome: "blocked", label: "new" });
    expect(store.getState().summary?.label).toBe("new");
  });
});

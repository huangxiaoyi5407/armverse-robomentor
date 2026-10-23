import { createStore } from "zustand/vanilla";
import type { WorkflowEvent } from "@/ai/workflow";

export interface WorkflowSummary { readonly outcome: "ready" | "blocked"; readonly label: string; }
interface WorkflowUiState { operationId: number; command: string; running: boolean; timeline: readonly WorkflowEvent[]; summary: WorkflowSummary | null; begin: (command: string) => number; append: (id: number, event: WorkflowEvent) => void; complete: (id: number, summary: WorkflowSummary) => void; fail: (id: number, message: string) => void; }

export function createWorkflowStore() {
  return createStore<WorkflowUiState>((set, get) => ({
    operationId: 0, command: "", running: false, timeline: [], summary: null,
    begin: (command) => { const id = get().operationId + 1; set({ operationId: id, command, running: true, timeline: [], summary: null }); return id; },
    append: (id, event) => { if (get().operationId === id) set((state) => ({ timeline: [...state.timeline, event] })); },
    complete: (id, summary) => { if (get().operationId === id) set({ running: false, summary }); },
    fail: (id, message) => { if (get().operationId === id) set((state) => ({ running: false, timeline: [...state.timeline, { state: "failed", message }] })); },
  }));
}

export const workflowStore = createWorkflowStore();

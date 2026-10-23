"use client";

import { create } from "zustand";
import type { SafetyReport } from "@/robotics/safety";
import type { Trajectory } from "@/robotics/trajectory";
import type { JointVector } from "@/robotics/types";
import { UR5_MODEL } from "@/robotics/ur5-model";

export const INITIAL_JOINTS = Object.freeze([
  0.2, -0.8, 1, -0.4, 0.6, -0.2,
]) as JointVector;

type SimulationStatus = "idle" | "preview" | "playing" | "paused" | "cancelled" | "blocked" | "complete";

interface SimulationState {
  joints: JointVector;
  preview: Trajectory | null;
  activeOperationId: number | null;
  status: SimulationStatus;
  nextOperationId: number;
  setJoint: (joint: number, value: number) => void;
  previewTrajectory: (trajectory: Trajectory, report: SafetyReport) => number;
  play: (operationId: number) => void;
  pause: () => void;
  cancel: () => void;
  commitCompletedTrajectory: (operationId: number) => void;
  reset: () => void;
}

function frozenJoints(values: readonly number[]): JointVector {
  return Object.freeze([...values]) as unknown as JointVector;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  joints: INITIAL_JOINTS,
  preview: null,
  activeOperationId: null,
  status: "idle",
  nextOperationId: 1,
  setJoint: (joint, value) => {
    if (!Number.isInteger(joint) || joint < 0 || joint >= 6 || !Number.isFinite(value)) {
      throw new TypeError("Joint index and value must be finite and valid.");
    }
    const limit = UR5_MODEL.jointLimits[joint];
    if (value < limit.min || value > limit.max) throw new RangeError("Joint value exceeds UR5 limits.");
    const next = [...get().joints];
    next[joint] = value;
    set({ joints: frozenJoints(next), status: "idle" });
  },
  previewTrajectory: (trajectory, report) => {
    const operationId = get().nextOperationId;
    if (report.verdict === "blocked" || report.approvedTrajectory === null) {
      set({
        preview: null,
        activeOperationId: null,
        status: "blocked",
        nextOperationId: operationId + 1,
      });
      return operationId;
    }
    set({
      preview: trajectory,
      activeOperationId: operationId,
      status: "preview",
      nextOperationId: operationId + 1,
    });
    return operationId;
  },
  play: (operationId) => {
    if (get().activeOperationId === operationId && get().preview) set({ status: "playing" });
  },
  pause: () => {
    if (get().status === "playing") set({ status: "paused" });
  },
  cancel: () => set({ preview: null, activeOperationId: null, status: "cancelled" }),
  commitCompletedTrajectory: (operationId) => {
    const state = get();
    if (state.activeOperationId !== operationId || !state.preview) return;
    const final = state.preview.samples.at(-1);
    if (!final) return;
    set({
      joints: frozenJoints(final.joints),
      preview: null,
      activeOperationId: null,
      status: "complete",
    });
  },
  reset: () => set({
    joints: INITIAL_JOINTS,
    preview: null,
    activeOperationId: null,
    status: "idle",
    nextOperationId: 1,
  }),
}));

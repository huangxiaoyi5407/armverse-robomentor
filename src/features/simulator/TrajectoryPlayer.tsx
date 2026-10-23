"use client";

import { useEffect } from "react";
import { useSimulationStore } from "./store";

export function TrajectoryPlayer() {
  const status = useSimulationStore((state) => state.status);
  const preview = useSimulationStore((state) => state.preview);
  const operationId = useSimulationStore((state) => state.activeOperationId);
  const commit = useSimulationStore((state) => state.commitCompletedTrajectory);

  useEffect(() => {
    if (status !== "playing" || !preview || operationId === null) return;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      if (useSimulationStore.getState().activeOperationId !== operationId ||
          useSimulationStore.getState().status !== "playing") return;
      if ((now - started) / 1000 >= preview.duration) {
        commit(operationId);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [commit, operationId, preview, status]);
  return null;
}

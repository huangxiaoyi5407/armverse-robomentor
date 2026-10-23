"use client";

import { useEffect } from "react";
import { useSimulationStore } from "./store";

export function TrajectoryPlayer() {
  const status = useSimulationStore((state) => state.status);
  const preview = useSimulationStore((state) => state.preview);
  const operationId = useSimulationStore((state) => state.activeOperationId);
  const commit = useSimulationStore((state) => state.commitCompletedTrajectory);
  const play = useSimulationStore((state) => state.play);
  const pause = useSimulationStore((state) => state.pause);
  const cancel = useSimulationStore((state) => state.cancel);

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
  if (!preview || operationId === null) return null;
  return <div className="trajectory-player" aria-label="轨迹播放控制">
    <button type="button" onClick={() => play(operationId)} disabled={status === "playing"}>播放轨迹</button>
    <button type="button" onClick={pause} disabled={status !== "playing"}>暂停轨迹</button>
    <button type="button" onClick={cancel}>取消轨迹</button>
    <span>{preview.samples.length} 个采样点 · {preview.duration.toFixed(1)} 秒</span>
  </div>;
}

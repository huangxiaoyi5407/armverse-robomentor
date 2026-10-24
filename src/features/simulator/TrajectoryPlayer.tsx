"use client";

import { useEffect } from "react";
import { useSimulationStore } from "./store";

export function TrajectoryPlayer() {
  const status = useSimulationStore((state) => state.status);
  const preview = useSimulationStore((state) => state.preview);
  const operationId = useSimulationStore((state) => state.activeOperationId);
  const playbackTime = useSimulationStore((state) => state.playbackTime);
  const commit = useSimulationStore((state) => state.commitCompletedTrajectory);
  const play = useSimulationStore((state) => state.play);
  const pause = useSimulationStore((state) => state.pause);
  const cancel = useSimulationStore((state) => state.cancel);
  const advance = useSimulationStore((state) => state.advanceTrajectory);

  useEffect(() => {
    if (status !== "playing" || !preview || operationId === null) return;
    const started = performance.now() - useSimulationStore.getState().playbackTime * 1000;
    let frame = 0;
    const tick = (now: number) => {
      if (useSimulationStore.getState().activeOperationId !== operationId ||
          useSimulationStore.getState().status !== "playing") return;
      const elapsed = Math.max(0, (now - started) / 1000);
      if (elapsed >= preview.duration) {
        commit(operationId);
        return;
      }
      advance(operationId, elapsed);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [advance, commit, operationId, preview, status]);
  if (!preview || operationId === null) return null;
  const percentage = Math.round(Math.min(1, playbackTime / preview.duration) * 100);
  return <div className="trajectory-player" aria-label="轨迹播放控制">
    <button type="button" onClick={() => play(operationId)} disabled={status === "playing"}>播放轨迹</button>
    <button type="button" onClick={pause} disabled={status !== "playing"}>暂停轨迹</button>
    <button type="button" onClick={cancel}>取消轨迹</button>
    <progress aria-label="轨迹播放进度" aria-valuenow={percentage} max={100} value={percentage} />
    <span>{percentage}% · {playbackTime.toFixed(1)} / {preview.duration.toFixed(1)} 秒</span>
    <span>{preview.samples.length} 个采样点</span>
  </div>;
}

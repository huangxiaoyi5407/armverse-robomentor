"use client";

import { useMemo, useState } from "react";
import { forwardKinematics, solveInverseKinematics } from "@/robotics/kinematics";
import { validateTrajectory } from "@/robotics/safety";
import { planJointTrajectory } from "@/robotics/trajectory";
import type { Vector3 } from "@/robotics/types";
import { UR5_MODEL } from "@/robotics/ur5-model";
import type { RecordEventInput } from "@/features/training-session/training-store";
import { useSimulationStore } from "./store";

export function IKTargetControls({ onTrainingEvent }: { onTrainingEvent?: (event: RecordEventInput) => void } = {}) {
  const joints = useSimulationStore((state) => state.joints);
  const previewTrajectory = useSimulationStore((state) => state.previewTrajectory);
  const currentPose = useMemo(() => forwardKinematics(UR5_MODEL, joints).endEffector, [joints]);
  const [target, setTarget] = useState<readonly [string, string, string]>(() => [
    (currentPose.position[0] + 0.06).toFixed(3),
    currentPose.position[1].toFixed(3),
    currentPose.position[2].toFixed(3),
  ]);
  const [message, setMessage] = useState("输入可达目标后先预览，再播放轨迹");
  const parsedTarget = target.map(Number) as unknown as Vector3;
  const targetIsValid = target.every((value, axis) => value.trim() !== "" &&
    Number.isFinite(parsedTarget[axis]) && Math.abs(parsedTarget[axis]) <= 1.5);
  const solve = () => {
    if (!targetIsValid) {
      setMessage("请先输入有效的 X、Y、Z 目标坐标");
      return;
    }
    onTrainingEvent?.({ code: "ATTEMPT_STARTED", severity: "info", elapsedMs: 0 });
    onTrainingEvent?.({ code: "TARGET_UPDATED", severity: "info", elapsedMs: 1, jointSnapshot: joints });
    const result = solveInverseKinematics(UR5_MODEL, { position: parsedTarget, orientation: currentPose.orientation }, joints);
    if (result.status !== "converged") {
      onTrainingEvent?.({ code: "IK_FAILED", severity: "warning", elapsedMs: 2, message: result.failureCode, findingCode: "IK_FAILURE" });
      setMessage(`求解失败：${result.failureCode}`);
      return;
    }
    onTrainingEvent?.({ code: "IK_SOLVED", severity: "info", elapsedMs: 2, jointSnapshot: result.joints });
    const trajectory = planJointTrajectory(joints, result.joints, { duration: 3, sampleCount: 61, mode: "quintic" });
    const report = validateTrajectory(UR5_MODEL, trajectory, { obstacles: [] });
    previewTrajectory(trajectory, report);
    onTrainingEvent?.({ code: report.verdict === "blocked" ? "SAFETY_BLOCKED" : "TRAJECTORY_PREVIEWED", severity: report.verdict === "blocked" ? "blocked" : "info", elapsedMs: 3 });
    setMessage(report.verdict === "blocked" ? "安全检查已阻断" : "逆解收敛，安全轨迹已进入预览");
  };
  return <fieldset className="ik-controls"><legend>逆运动学目标 / m</legend>
    <div>{target.map((value, axis) => <label key={axis}><span>{["X", "Y", "Z"][axis]}</span><input aria-label={`目标 ${["X", "Y", "Z"][axis]}`} type="number" step="0.01" value={value} onChange={(event) => {
      const nextValue = event.currentTarget.value;
      setTarget((previous) => previous.map((item, index) => index === axis ? nextValue : item) as unknown as readonly [string, string, string]);
      if (nextValue.trim() === "" || !Number.isFinite(Number(nextValue)) || Math.abs(Number(nextValue)) > 1.5) {
        setMessage("请先输入有效的 X、Y、Z 目标坐标");
      }
    }} /></label>)}<button type="button" onClick={solve} disabled={!targetIsValid}>求解逆运动学并预览</button></div>
    <p role="status">{message}</p>
  </fieldset>;
}

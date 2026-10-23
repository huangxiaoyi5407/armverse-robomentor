"use client";

import { useMemo, useState } from "react";
import { forwardKinematics, solveInverseKinematics } from "@/robotics/kinematics";
import { validateTrajectory } from "@/robotics/safety";
import { planJointTrajectory } from "@/robotics/trajectory";
import type { Vector3 } from "@/robotics/types";
import { UR5_MODEL } from "@/robotics/ur5-model";
import { useSimulationStore } from "./store";

export function IKTargetControls() {
  const joints = useSimulationStore((state) => state.joints);
  const previewTrajectory = useSimulationStore((state) => state.previewTrajectory);
  const currentPose = useMemo(() => forwardKinematics(UR5_MODEL, joints).endEffector, [joints]);
  const [target, setTarget] = useState<Vector3>(() => [currentPose.position[0] + 0.02, currentPose.position[1], currentPose.position[2]]);
  const [message, setMessage] = useState("输入可达目标后先预览，再播放轨迹");
  const solve = () => {
    const result = solveInverseKinematics(UR5_MODEL, { position: target, orientation: currentPose.orientation }, joints);
    if (result.status !== "converged") { setMessage(`求解失败：${result.failureCode}`); return; }
    const trajectory = planJointTrajectory(joints, result.joints, { duration: 3, sampleCount: 61, mode: "quintic" });
    const report = validateTrajectory(UR5_MODEL, trajectory, { obstacles: [] });
    previewTrajectory(trajectory, report);
    setMessage(report.verdict === "blocked" ? "安全检查已阻断" : "逆解收敛，安全轨迹已进入预览");
  };
  return <fieldset className="ik-controls"><legend>逆运动学目标 / m</legend>
    <div>{target.map((value, axis) => <label key={axis}><span>{["X", "Y", "Z"][axis]}</span><input aria-label={`目标 ${["X", "Y", "Z"][axis]}`} type="number" step="0.01" value={value} onChange={(event) => setTarget((previous) => previous.map((item, index) => index === axis ? Number(event.currentTarget.value) : item) as unknown as Vector3)} /></label>)}<button type="button" onClick={solve}>求解逆运动学并预览</button></div>
    <p>{message}</p>
  </fieldset>;
}

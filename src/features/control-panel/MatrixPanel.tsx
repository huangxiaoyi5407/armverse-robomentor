"use client";

import { useMemo } from "react";
import { forwardKinematics } from "@/robotics/kinematics";
import { UR5_MODEL } from "@/robotics/ur5-model";
import { useSimulationStore } from "@/features/simulator/store";

export function MatrixPanel() {
  const joints = useSimulationStore((state) => state.joints);
  const matrix = useMemo(() => forwardKinematics(UR5_MODEL, joints).frames.at(-1)!, [joints]);
  return <section className="matrix-panel" aria-label="末端齐次变换矩阵">
    <p className="panel-kicker">T₀⁶ · ROW MAJOR</p><h2>齐次变换矩阵</h2>
    <div className="matrix-grid" aria-label="四乘四变换矩阵">{matrix.map((value, index) => <code key={index}>{value.toFixed(3)}</code>)}</div>
  </section>;
}

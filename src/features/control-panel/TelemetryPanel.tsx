"use client";

import { useMemo } from "react";
import { geometricJacobian, singularityMetrics } from "@/robotics/jacobian";
import { forwardKinematics } from "@/robotics/kinematics";
import { UR5_MODEL } from "@/robotics/ur5-model";
import { useSimulationStore } from "@/features/simulator/store";

const riskLabel = { safe: "安全", warning: "接近奇异", singular: "奇异" } as const;

export function TelemetryPanel() {
  const joints = useSimulationStore((state) => state.joints);
  const telemetry = useMemo(() => {
    const kinematics = forwardKinematics(UR5_MODEL, joints);
    return { pose: kinematics.endEffector, metrics: singularityMetrics(geometricJacobian(UR5_MODEL, joints)) };
  }, [joints]);
  return <section className="telemetry-panel" aria-label="机器人实时遥测">
    <div className="panel-heading"><div><p className="panel-kicker">LIVE TELEMETRY</p><h2>末端位姿</h2></div><span className={`risk-badge ${telemetry.metrics.risk}`}>{riskLabel[telemetry.metrics.risk]}</span></div>
    <dl className="metric-grid">{telemetry.pose.position.map((value, index) => <div key={index}><dt>{["X", "Y", "Z"][index]} / m</dt><dd>{value.toFixed(3)}</dd></div>)}</dl>
    <div className="signal-row"><span>最小奇异值</span><strong>{telemetry.metrics.minSingularValue.toExponential(2)}</strong></div>
    <div className="signal-row"><span>可操作度</span><strong>{telemetry.metrics.manipulability.toExponential(2)}</strong></div>
  </section>;
}

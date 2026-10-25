"use client";

import { useMemo, useState } from "react";
import { reduceDeviceGateway, createDeviceGatewayState, type DeviceGatewayEvent, type DeviceGatewayStatus } from "@/integration/device-gateway";
import { toJointTrajectoryMessage } from "@/integration/ros2";
import { planJointTrajectory } from "@/robotics/trajectory";
import { validateTrajectory } from "@/robotics/safety";
import { UR5_MODEL } from "@/robotics/ur5-model";
import { INITIAL_JOINTS } from "@/features/simulator/store";

const STATUS_LABELS: Readonly<Record<DeviceGatewayStatus, string>> = Object.freeze({
  disconnected: "未连接", connecting: "连接中", connected: "已连接", "emergency-stop": "急停", fault: "故障",
});

export function IntegrationPanel() {
  const [gateway, setGateway] = useState(createDeviceGatewayState);
  const approved = useMemo(() => {
    const target = Object.freeze([0.3, -0.7, 0.9, -0.3, 0.5, -0.1]) as typeof INITIAL_JOINTS;
    const trajectory = planJointTrajectory(INITIAL_JOINTS, target, { duration: 2, sampleCount: 5, mode: "quintic" });
    return { trajectory, report: validateTrajectory(UR5_MODEL, trajectory, { obstacles: [] }) };
  }, []);
  const dispatch = (event: DeviceGatewayEvent) => setGateway((current) => reduceDeviceGateway(current, event));
  const exportTrajectory = () => {
    dispatch({ type: "queue-trajectory", trajectory: approved.trajectory, safetyReport: approved.report });
    const payload = JSON.stringify(toJointTrajectoryMessage(approved.trajectory), null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "armverse-joint-trajectory.json"; anchor.click(); URL.revokeObjectURL(url);
  };
  return <section className="integration-panel" aria-label="工业接口模拟">
    <header><div><p className="panel-kicker">ROS 2 · DEVICE GATEWAY</p><h2>工业接口教学实验</h2><p>导出 JointTrajectory 兼容 JSON，并观察连接、心跳、急停和故障状态机。</p></div><p role="status" aria-label="网关状态">{STATUS_LABELS[gateway.status]}</p></header>
    <p className="integration-boundary">接口模拟，未连接真实机械臂</p>
    <div className="integration-grid">
      <article><h3>ROS 2 轨迹导出</h3><p>六关节名称、位置、速度与 sec/nanosec 时间戳。</p><strong>{approved.trajectory.samples.length} 个已审批采样点</strong><button type="button" disabled={gateway.status !== "connected"} onClick={exportTrajectory}>导出已审批轨迹 JSON</button></article>
      <article><h3>设备网关状态机</h3><p>心跳序号 {gateway.heartbeatSequence}</p><p>已排队采样 {gateway.queuedSamples}</p><div className="gateway-actions">
        <button type="button" disabled={gateway.status !== "disconnected"} onClick={() => dispatch({ type: "connect" })}>连接模拟网关</button>
        <button type="button" disabled={gateway.status !== "connecting"} onClick={() => dispatch({ type: "connected" })}>完成模拟握手</button>
        <button type="button" disabled={gateway.status !== "connected"} onClick={() => dispatch({ type: "heartbeat" })}>发送心跳</button>
        <button type="button" disabled={gateway.status === "emergency-stop"} onClick={() => dispatch({ type: "emergency-stop" })}>模拟急停</button>
        <button type="button" disabled={gateway.status === "disconnected"} onClick={() => dispatch({ type: "reset" })}>复位断开</button>
      </div></article>
    </div>
    <p className="model-boundary">所有轨迹必须与确定性安全报告中的 approvedTrajectory 完全一致，网络接口不能绕过安全门。</p>
  </section>;
}

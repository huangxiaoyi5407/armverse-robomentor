"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { JointControls } from "./JointControls";
import { IKTargetControls } from "./IKTargetControls";
import { TrajectoryPlayer } from "./TrajectoryPlayer";
import { UR5Arm } from "./UR5Arm";
import { useSimulationStore } from "./store";

const STATUS_LABELS = {
  idle: "手动模式",
  preview: "轨迹预览",
  playing: "轨迹播放",
  paused: "已暂停",
  cancelled: "已取消",
  blocked: "安全阻断",
  complete: "轨迹完成",
} as const;

export function RobotScene() {
  const joints = useSimulationStore((state) => state.joints);
  const status = useSimulationStore((state) => state.status);
  const setJoint = useSimulationStore((state) => state.setJoint);
  const [showFrames, setShowFrames] = useState(false);

  return (
    <section className="simulator-shell" aria-label="UR5 三维仿真实验台">
      <div className="scene-stage">
        <Canvas camera={{ position: [1.4, 1.1, 1.4], fov: 42 }}>
          <color attach="background" args={["#0c1419"]} />
          <ambientLight intensity={1.4} />
          <directionalLight position={[2, 3, 2]} intensity={3} />
          <Grid args={[4, 40]} cellColor="#294653" sectionColor="#537889" fadeDistance={6} />
          <UR5Arm joints={joints} showFrames={showFrames} />
          <OrbitControls makeDefault />
        </Canvas>
        <div data-testid="target-marker" className="target-marker" aria-label="目标位姿标记">目标</div>
      </div>
      <div className="simulator-controls">
        <div className="simulator-toolbar">
          <p role="status" aria-label="仿真状态">{STATUS_LABELS[status]}</p>
          <label>
            <input
              type="checkbox"
              aria-label="显示坐标系"
              checked={showFrames}
              onChange={(event) => setShowFrames(event.currentTarget.checked)}
            />
            显示坐标系
          </label>
          {showFrames ? <span>坐标系已显示</span> : null}
        </div>
        <IKTargetControls />
        <JointControls joints={joints} onChange={setJoint} />
      </div>
      <TrajectoryPlayer />
    </section>
  );
}

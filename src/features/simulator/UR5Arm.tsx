"use client";

import { Line } from "@react-three/drei";
import { forwardKinematics } from "@/robotics/kinematics";
import type { JointVector } from "@/robotics/types";
import { UR5_MODEL } from "@/robotics/ur5-model";

export function armVisualGeometry(joints: JointVector) {
  const frames = forwardKinematics(UR5_MODEL, joints).frames;
  const points: [number, number, number][] = [
    [0, 0, 0],
    ...frames.map((frame) => [frame[3], frame[11], -frame[7]] as [number, number, number]),
  ];
  const endFrame = frames.at(-1)!;
  const end = points.at(-1)!;
  const toolTip: [number, number, number] = [
    end[0] + endFrame[0] * 0.13,
    end[1] + endFrame[8] * 0.13,
    end[2] - endFrame[4] * 0.13,
  ];
  return { frames, points, toolPoints: [end, toolTip] as const };
}

export function UR5Arm({ joints, showFrames }: { joints: JointVector; showFrames: boolean }) {
  const { points, toolPoints } = armVisualGeometry(joints);
  return (
    <group>
      <Line points={points} color="#78d7c6" lineWidth={6} />
      <Line aria-label="末端工具朝向" points={toolPoints} color="#f0a34a" lineWidth={10} />
      {points.map((position, index) => (
        <group position={position} key={index}>
          <mesh>
            <sphereGeometry args={[index === 0 ? 0.055 : 0.04, 24, 16]} />
            <meshStandardMaterial color={index === 6 ? "#f0a34a" : "#d9e4e8"} metalness={0.55} roughness={0.28} />
          </mesh>
          {showFrames ? <axesHelper args={[0.11]} /> : null}
        </group>
      ))}
    </group>
  );
}

"use client";

import type { JointVector } from "@/robotics/types";
import { UR5_MODEL } from "@/robotics/ur5-model";

export function JointControls({ joints, onChange }: {
  joints: JointVector;
  onChange: (joint: number, value: number) => void;
}) {
  return (
    <div className="joint-controls" aria-label="六关节控制器">
      {joints.map((value, index) => (
        <label key={index}>
          <span>关节 {index + 1}</span>
          <output>{(value * 180 / Math.PI).toFixed(1)}°</output>
          <input
            aria-label={`关节 ${index + 1}`}
            type="range"
            min={UR5_MODEL.jointLimits[index].min}
            max={UR5_MODEL.jointLimits[index].max}
            step={0.01}
            value={value}
            onChange={(event) => onChange(index, Number(event.currentTarget.value))}
          />
        </label>
      ))}
    </div>
  );
}

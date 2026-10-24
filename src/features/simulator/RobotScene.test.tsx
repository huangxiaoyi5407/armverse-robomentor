import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateTrajectory } from "@/robotics/safety";
import { planJointTrajectory } from "@/robotics/trajectory";
import { UR5_MODEL } from "@/robotics/ur5-model";
import { INITIAL_JOINTS, useSimulationStore } from "./store";

vi.mock("@react-three/fiber", () => ({
  Canvas: () => <div data-testid="three-canvas" />,
  useFrame: () => undefined,
}));
vi.mock("@react-three/drei", () => ({
  Grid: () => null,
  OrbitControls: () => null,
  Line: () => null,
}));

import { RobotScene } from "./RobotScene";
import { armVisualGeometry } from "./UR5Arm";

describe("RobotScene", () => {
  beforeEach(() => useSimulationStore.getState().reset());

  it("exposes six labelled joints, frame toggle, target marker, and status", () => {
    render(<RobotScene />);
    for (let joint = 1; joint <= 6; joint += 1) {
      expect(screen.getByRole("slider", { name: `关节 ${joint}` })).toBeInTheDocument();
    }
    expect(screen.getByRole("checkbox", { name: "显示坐标系" })).toBeInTheDocument();
    expect(screen.getByTestId("target-marker")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "仿真状态" })).toHaveTextContent("手动模式");
    fireEvent.click(screen.getByRole("checkbox", { name: "显示坐标系" }));
    expect(screen.getByText("坐标系已显示")).toBeInTheDocument();
  });

  it("keeps an unfinished X edit local and disables IK solving", () => {
    render(<RobotScene />);
    const input = screen.getByRole("spinbutton", { name: "目标 X" });

    fireEvent.change(input, { target: { value: "" } });

    expect(input).toHaveValue(null);
    expect(screen.getByRole("button", { name: "求解逆运动学并预览" })).toBeDisabled();
    expect(screen.getByText("请先输入有效的 X、Y、Z 目标坐标")).toBeVisible();
  });

  it("shows joint 6 rotation through an oriented end-effector marker", () => {
    const before = armVisualGeometry(INITIAL_JOINTS);
    const rotated = armVisualGeometry([
      ...INITIAL_JOINTS.slice(0, 5), 0.9,
    ] as unknown as typeof INITIAL_JOINTS);

    expect(rotated.points).toEqual(before.points);
    expect(rotated.toolPoints).not.toEqual(before.toolPoints);
  });

  it("shows trajectory playback progress", () => {
    const target = [0.5, -1, 1.2, -0.2, 0.8, 0.4] as const;
    const trajectory = planJointTrajectory(INITIAL_JOINTS, target, {
      duration: 3,
      sampleCount: 61,
      mode: "quintic",
    });
    useSimulationStore.getState().previewTrajectory(
      trajectory,
      validateTrajectory(UR5_MODEL, trajectory, { obstacles: [] }),
    );

    render(<RobotScene />);

    expect(screen.getByRole("progressbar", { name: "轨迹播放进度" })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("0% · 0.0 / 3.0 秒")).toBeVisible();
  });
});

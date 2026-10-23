import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

describe("RobotScene", () => {
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
});

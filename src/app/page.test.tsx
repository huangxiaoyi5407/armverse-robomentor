import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/simulator/RobotScene", () => ({
  RobotScene: () => <section aria-label="UR5 三维仿真实验台">3D simulator</section>,
}));
import HomePage from "@/app/page";

describe("project foundation", () => {
  it("exposes the 臂境智教 page title", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: "臂境智教" })).toBeVisible();
  });

  it("clearly identifies demo mode without an AI key", () => {
    render(<HomePage />);

    expect(screen.getByRole("status", { name: "运行模式" })).toHaveTextContent("Demo 演示模式");
    expect(screen.getByRole("status", { name: "运行模式" })).toHaveTextContent("无需 AI 密钥");
  });

  it("renders seven keyboard-accessible lessons and telemetry panels", () => {
    render(<HomePage />);
    expect(screen.getAllByRole("button", { name: /第\d章/ })).toHaveLength(7);
    expect(screen.getByRole("region", { name: "实验步骤" })).toBeInTheDocument();
    expect(screen.getByText("末端位姿")).toBeInTheDocument();
    expect(screen.getByText("齐次变换矩阵")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "UR5 三维仿真实验台" })).toBeInTheDocument();
  });

  it("switches from chapter lessons to the disclosed comprehensive training workspace", () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: "综合实训" }));

    expect(screen.getByRole("heading", { name: "柔性产线轨迹规划与安全控制" })).toBeVisible();
    expect(screen.getByText("教学演示合成数据，不代表真实学生表现")).toBeVisible();
    expect(screen.getByRole("region", { name: "UR5 三维仿真实验台" })).toBeVisible();
  });

  it("switches between the student lab and teacher class drill-down", () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: "教师工作台" }));
    expect(screen.getByRole("region", { name: "教师工作台" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "自动化 2301 班（合成示例）" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "UR5 三维仿真实验台" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "学生实验台" }));
    expect(screen.getByRole("region", { name: "UR5 三维仿真实验台" })).toBeVisible();
  });
});

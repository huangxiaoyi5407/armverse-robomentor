import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SYNTHETIC_CLASS } from "@/training/synthetic-data";
import { TeacherDashboard } from "./TeacherDashboard";

describe("teacher dashboard", () => {
  it("shows disclosed class metrics and errors in descending frequency", () => {
    render(<TeacherDashboard trainingClass={SYNTHETIC_CLASS} />);

    expect(screen.getByText("教学演示合成数据，不代表真实学生表现")).toBeVisible();
    const metrics = screen.getByRole("region", { name: "班级实训指标" });
    expect(within(metrics).getByText("90 次")).toBeVisible();
    expect(within(metrics).getByText("73.3%")).toBeVisible();
    expect(within(metrics).getByText("2.0 次")).toBeVisible();
    expect(within(metrics).getByText("83.3 分")).toBeVisible();
    expect(within(metrics).getByText("6 次")).toBeVisible();

    const distribution = screen.getByRole("region", { name: "错误类型分布" });
    expect(within(distribution).getAllByRole("listitem").map((row) => row.textContent)).toEqual([
      "SINGULARITY奇异位形45",
      "COLLISION碰撞风险22",
      "IK_FAILURE逆解失败22",
    ]);
  });

  it("lists sessions needing support and opens a synthetic session drill-down", () => {
    render(<TeacherDashboard trainingClass={SYNTHETIC_CLASS} />);

    const support = screen.getByRole("region", { name: "需关注会话" });
    expect(within(support).getAllByRole("button", { name: /查看会话/ })).toHaveLength(6);
    fireEvent.click(within(support).getAllByRole("button", { name: /查看会话/ })[0]);

    const detail = screen.getByRole("region", { name: "会话详情" });
    expect(within(detail).getByText(/合成学生/)).toBeVisible();
    expect(within(detail).getByText("需关注")).toBeVisible();
    expect(within(detail).getByText(/尝试次数/)).toBeVisible();
    expect(within(detail).getAllByText("安全得分")).toHaveLength(2);
    const timeline = screen.getByRole("region", { name: "合成事件时间线" });
    expect(within(timeline).getByText("SESSION_STARTED")).toBeVisible();
    expect(within(timeline).getByText("SESSION_REQUIRES_SUPPORT")).toBeVisible();
    const report = screen.getByRole("region", { name: "合成会话报告" });
    expect(within(report).getByText("教学演示合成数据，不代表真实学生表现")).toBeVisible();
    expect(within(report).getByText(/证据：SYN-/)).toBeVisible();
  });
});

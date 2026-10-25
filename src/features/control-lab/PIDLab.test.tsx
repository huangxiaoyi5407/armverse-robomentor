import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PIDLab } from "./PIDLab";

describe("PID control teaching lab", () => {
  it("renders accessible gains, deterministic metrics, curve labels, and boundary copy", () => {
    render(<PIDLab />);

    expect(screen.getByRole("spinbutton", { name: "Kp" })).toHaveValue(12);
    expect(screen.getByRole("spinbutton", { name: "Ki" })).toHaveValue(2);
    expect(screen.getByRole("spinbutton", { name: "Kd" })).toHaveValue(5);
    const metrics = screen.getByRole("region", { name: "PID 响应指标" });
    expect(within(metrics).getByText("超调量")).toBeVisible();
    expect(within(metrics).getByText("稳态误差")).toBeVisible();
    expect(within(metrics).getByText("上升时间")).toBeVisible();
    expect(within(metrics).getByText("调节时间")).toBeVisible();
    expect(screen.getByRole("img", { name: "PID 响应曲线" })).toBeVisible();
    expect(screen.getByText("期望角度")).toBeVisible();
    expect(screen.getByText("实际角度")).toBeVisible();
    expect(screen.getByText("确定性教学仿真，无随机噪声，不直接控制真实机械臂")).toBeVisible();
  });

  it("loads stable, under-tuned, and over-tuned presets and recalculates the response", () => {
    render(<PIDLab />);
    fireEvent.click(screen.getByRole("button", { name: "过调预设" }));
    expect(screen.getByRole("spinbutton", { name: "Kp" })).toHaveValue(35);
    expect(screen.getByRole("spinbutton", { name: "Ki" })).toHaveValue(8);
    expect(screen.getByRole("status", { name: "响应类型" })).toHaveTextContent("过调响应");

    fireEvent.click(screen.getByRole("button", { name: "欠调预设" }));
    expect(screen.getByRole("spinbutton", { name: "Kp" })).toHaveValue(0.1);
    expect(screen.getByRole("status", { name: "响应类型" })).toHaveTextContent("欠调响应");

    fireEvent.click(screen.getByRole("button", { name: "稳定预设" }));
    expect(screen.getByRole("status", { name: "响应类型" })).toHaveTextContent("稳定响应");
  });

  it("exposes teaching inertia, payload, and friction controls with an exact model disclaimer", () => {
    render(<PIDLab />);
    expect(screen.getByRole("spinbutton", { name: "关节惯量" })).toHaveValue(1);
    expect(screen.getByRole("spinbutton", { name: "负载等效惯量" })).toHaveValue(0);
    expect(screen.getByRole("spinbutton", { name: "粘性摩擦" })).toHaveValue(0.4);
    expect(screen.getByRole("spinbutton", { name: "库仑摩擦" })).toHaveValue(0.1);
    expect(screen.getByText("教学简化模型，不用于真实机械臂选型或安全控制")).toBeVisible();

    fireEvent.change(screen.getByRole("spinbutton", { name: "负载等效惯量" }), { target: { value: "2" } });
    expect(screen.getByRole("spinbutton", { name: "负载等效惯量" })).toHaveValue(2);
  });
});

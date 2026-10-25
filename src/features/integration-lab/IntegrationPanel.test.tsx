import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IntegrationPanel } from "./IntegrationPanel";

describe("industrial interface teaching panel", () => {
  it("discloses simulation boundaries and demonstrates connection, heartbeat, export, and emergency stop", () => {
    render(<IntegrationPanel />);
    expect(screen.getByText("接口模拟，未连接真实机械臂")).toBeVisible();
    expect(screen.getByRole("status", { name: "网关状态" })).toHaveTextContent("未连接");
    expect(screen.getByRole("button", { name: "导出已审批轨迹 JSON" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "连接模拟网关" }));
    expect(screen.getByRole("status", { name: "网关状态" })).toHaveTextContent("连接中");
    fireEvent.click(screen.getByRole("button", { name: "完成模拟握手" }));
    fireEvent.click(screen.getByRole("button", { name: "发送心跳" }));
    expect(screen.getByText("心跳序号 1")).toBeVisible();
    expect(screen.getByRole("button", { name: "导出已审批轨迹 JSON" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "模拟急停" }));
    expect(screen.getByRole("status", { name: "网关状态" })).toHaveTextContent("急停");
    expect(screen.getByRole("button", { name: "导出已审批轨迹 JSON" })).toBeDisabled();
  });
});

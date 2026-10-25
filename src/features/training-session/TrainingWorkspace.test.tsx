import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useTrainingStore } from "./training-store";
import { TrainingWorkspace } from "./TrainingWorkspace";

describe("flexible manufacturing training workspace", () => {
  beforeEach(() => useTrainingStore.getState().resetSession());

  it("starts a disclosed synthetic task and traces a filterable blocked event", () => {
    render(<TrainingWorkspace />);

    expect(screen.getByText("教学演示合成数据，不代表真实学生表现")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "开始综合实训" }));
    expect(screen.getByRole("heading", { name: "柔性产线轨迹规划与安全控制" })).toBeVisible();

    const sessionId = useTrainingStore.getState().session?.id;
    expect(sessionId).toBeTruthy();
    act(() => useTrainingStore.getState().recordEvent(sessionId!, {
      code: "SAFETY_BLOCKED",
      severity: "blocked",
      elapsedMs: 200,
      findingCode: "OBSTACLE_COLLISION",
      message: "A link intersects the inspection safety zone.",
    }));

    fireEvent.change(screen.getByRole("combobox", { name: "筛选事件" }), { target: { value: "blocked" } });
    expect(screen.getByText("轨迹进入设备禁入区，确定性安全门已阻断执行。")).toBeVisible();
    expect(screen.getByText("缩小路径范围或调整中间路径点后重新规划。")).toBeVisible();
    expect(screen.queryByText("实训会话已开始")).not.toBeInTheDocument();
  });

  it("marks a completed session and keeps its event trace visible", () => {
    render(<TrainingWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "开始综合实训" }));
    fireEvent.click(screen.getByRole("button", { name: "完成本次实训" }));

    expect(screen.getByRole("status", { name: "实训状态" })).toHaveTextContent("已完成");
    expect(screen.getByText("SESSION_COMPLETED")).toBeVisible();
  });
});

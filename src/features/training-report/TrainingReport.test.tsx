import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TrainingReportModel } from "@/training/report";
import { ReportActions } from "./ReportActions";
import { TrainingReport } from "./TrainingReport";

const model: TrainingReportModel = Object.freeze({
  sessionId: "SESSION-1",
  studentId: "SYN-001",
  taskTitle: "柔性产线轨迹规划",
  objective: "完成安全搬运。",
  generatedAtLabel: "实训结束后生成 · T+5.00s",
  dataNotice: "教学演示合成数据，不代表真实学生表现",
  score: Object.freeze({ total: 95, completion: 30, safety: 45, efficiency: 20, deductions: Object.freeze([]) }),
  metrics: Object.freeze([
    Object.freeze({ label: "综合得分", value: "95 / 100", sourceEventIds: Object.freeze(["E1", "E2"]) }),
  ]),
  safetyEvents: Object.freeze([
    Object.freeze({ id: "E2", code: "SINGULARITY_WARNING", message: "接近奇异位形", severity: "warning" as const }),
  ]),
});

describe("training report view", () => {
  it("renders evidence, safety findings, score, and data boundaries", () => {
    render(<TrainingReport report={model} />);
    expect(screen.getByRole("heading", { name: "实训报告" })).toBeVisible();
    expect(screen.getByText("95 / 100")).toBeVisible();
    expect(screen.getByText("证据：E1、E2")).toBeVisible();
    expect(screen.getByText("SINGULARITY_WARNING")).toBeVisible();
    expect(screen.getByText(model.dataNotice)).toBeVisible();
  });

  it("prints only when a completed report is available", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const { rerender } = render(<ReportActions report={null} />);
    expect(screen.getByRole("button", { name: "打印或导出 PDF" })).toBeDisabled();
    rerender(<ReportActions report={model} />);
    fireEvent.click(screen.getByRole("button", { name: "打印或导出 PDF" }));
    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });
});

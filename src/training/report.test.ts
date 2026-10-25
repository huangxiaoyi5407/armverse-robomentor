import { describe, expect, it } from "vitest";
import { appendTrainingEvent, createTrainingEvent, createTrainingSession } from "./events";
import { buildTrainingReport } from "./report";
import type { TrainingTask } from "./types";

const task: TrainingTask = Object.freeze({ id: "TASK-PATH", title: "柔性产线轨迹规划", objective: "完成安全搬运。" });

function completedSession() {
  let session = createTrainingSession({ id: "SESSION-1", studentId: "SYN-001", taskId: task.id });
  const facts = [
    ["E1", "SESSION_STARTED", "info"],
    ["E2", "ATTEMPT_STARTED", "info"],
    ["E3", "SINGULARITY_WARNING", "warning"],
    ["E4", "ATTEMPT_STARTED", "info"],
    ["E5", "TRAJECTORY_PLAYED", "info"],
    ["E6", "SESSION_COMPLETED", "info"],
  ] as const;
  facts.forEach(([id, code, severity], index) => {
    session = appendTrainingEvent(session, createTrainingEvent({ id, sessionId: session.id, elapsedMs: index * 1000, code, severity }));
  });
  return Object.freeze({ ...session, status: "completed" as const });
}

describe("traceable training report", () => {
  it("builds deterministic metrics whose evidence ids exist in the session", () => {
    const session = completedSession();
    const report = buildTrainingReport(session, task);
    const eventIds = new Set(session.events.map((event) => event.id));

    expect(report.sessionId).toBe(session.id);
    expect(report.taskTitle).toBe(task.title);
    expect(report.score.total).toBe(91);
    expect(report.metrics.map((metric) => metric.label)).toEqual(["实训用时", "操作尝试", "安全事件", "综合得分"]);
    for (const metric of report.metrics) {
      expect(metric.sourceEventIds.length).toBeGreaterThan(0);
      expect(metric.sourceEventIds.every((id) => eventIds.has(id))).toBe(true);
    }
    expect(report.generatedAtLabel).toBe("实训结束后生成 · T+5.00s");
  });

  it("includes safety evidence and the synthetic-data declaration", () => {
    const report = buildTrainingReport(completedSession(), task);
    expect(report.dataNotice).toBe("教学演示合成数据，不代表真实学生表现");
    expect(report.safetyEvents).toHaveLength(1);
    expect(report.safetyEvents[0].code).toBe("SINGULARITY_WARNING");
  });

  it("rejects incomplete sessions and mismatched tasks", () => {
    const active = createTrainingSession({ id: "ACTIVE", studentId: "SYN-001", taskId: task.id });
    expect(() => buildTrainingReport(active, task)).toThrow(/complete/i);
    expect(() => buildTrainingReport(completedSession(), { ...task, id: "OTHER" })).toThrow(/task/i);
  });
});

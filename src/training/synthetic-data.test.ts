import { describe, expect, it } from "vitest";
import { SYNTHETIC_CLASS, SYNTHETIC_DATA_NOTICE } from "./synthetic-data";

describe("synthetic classroom dataset", () => {
  it("provides a deterministic disclosed class with 30 anonymous students and three tasks", () => {
    expect(SYNTHETIC_DATA_NOTICE).toBe("教学演示合成数据，不代表真实学生表现");
    expect(SYNTHETIC_CLASS.name).toBe("自动化 2301 班（合成示例）");
    expect(SYNTHETIC_CLASS.students).toHaveLength(30);
    expect(SYNTHETIC_CLASS.tasks).toHaveLength(3);
    expect(new Set(SYNTHETIC_CLASS.students.map((student) => student.id)).size).toBe(30);
    expect(new Set(SYNTHETIC_CLASS.tasks.map((task) => task.id)).size).toBe(3);
    expect(SYNTHETIC_CLASS.students.every((student) => /^SYN-\d{3}$/.test(student.id))).toBe(true);
    expect(SYNTHETIC_CLASS.students.every((student) => student.name.startsWith("合成学生"))).toBe(true);
    expect(SYNTHETIC_CLASS.dataNotice).toBe(SYNTHETIC_DATA_NOTICE);
  });

  it("keeps every summary internally valid and linked to declared records", () => {
    const studentIds = new Set(SYNTHETIC_CLASS.students.map((student) => student.id));
    const taskIds = new Set(SYNTHETIC_CLASS.tasks.map((task) => task.id));

    for (const session of SYNTHETIC_CLASS.sessions) {
      expect(studentIds.has(session.studentId)).toBe(true);
      expect(taskIds.has(session.taskId)).toBe(true);
      expect(session.attempts).toBeGreaterThanOrEqual(1);
      expect(session.safetyScore).toBeGreaterThanOrEqual(0);
      expect(session.safetyScore).toBeLessThanOrEqual(100);
      expect(Object.isFrozen(session)).toBe(true);
    }
    expect(Object.isFrozen(SYNTHETIC_CLASS)).toBe(true);
  });
});

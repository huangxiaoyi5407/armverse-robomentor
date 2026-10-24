import type { TrainingClass, TrainingSessionStatus, TrainingSessionSummary, TrainingStudent, TrainingTask } from "./types";

export const SYNTHETIC_DATA_NOTICE = "教学演示合成数据，不代表真实学生表现";

const students: readonly TrainingStudent[] = Object.freeze(Array.from({ length: 30 }, (_, index) => Object.freeze({
  id: `SYN-${String(index + 1).padStart(3, "0")}`,
  name: `合成学生${String(index + 1).padStart(2, "0")}`,
})));

const tasks: readonly TrainingTask[] = Object.freeze([
  Object.freeze({ id: "TASK-FK", title: "关节运动与正运动学", objective: "根据关节变化验证末端位姿映射。" }),
  Object.freeze({ id: "TASK-PATH", title: "柔性产线轨迹规划", objective: "规划取料、检测与放料之间的连续安全轨迹。" }),
  Object.freeze({ id: "TASK-SAFETY", title: "安全区域与奇异性挑战", objective: "识别碰撞、越界与奇异位形风险并完成修正。" }),
]);

const errorPatterns = Object.freeze([
  Object.freeze([]),
  Object.freeze(["SINGULARITY"]),
  Object.freeze(["IK_FAILURE"]),
  Object.freeze(["COLLISION", "SINGULARITY"]),
]);

function sessionStatus(studentIndex: number, taskIndex: number): TrainingSessionStatus {
  const marker = (studentIndex * 2 + taskIndex) % 10;
  if (marker <= 6) return "completed";
  if (marker <= 8) return "in-progress";
  return "needs-support";
}

const sessions: readonly TrainingSessionSummary[] = Object.freeze(students.flatMap((student, studentIndex) => tasks.map((task, taskIndex) => {
  const status = sessionStatus(studentIndex, taskIndex);
  const attempts = 1 + ((studentIndex + taskIndex) % 3);
  const errors = errorPatterns[(studentIndex + taskIndex * 2) % errorPatterns.length];
  const safetyScore = Math.max(0, 100 - errors.length * 12 - (attempts - 1) * 4 - (status === "needs-support" ? 12 : 0));
  return Object.freeze({
    id: `SESSION-${String(studentIndex + 1).padStart(3, "0")}-${task.id}`,
    studentId: student.id,
    taskId: task.id,
    status,
    attempts,
    safetyScore,
    errorCodes: errors,
  });
})));

export const SYNTHETIC_CLASS: TrainingClass = Object.freeze({
  id: "CLASS-AUTO-2301-SYNTHETIC",
  name: "自动化 2301 班（合成示例）",
  dataNotice: SYNTHETIC_DATA_NOTICE,
  students,
  tasks,
  sessions,
});

import { describe, expect, it, vi } from "vitest";
import { LESSONS } from "./lesson-data";
import { changeLesson } from "./LessonPanel";

describe("lesson definitions", () => {
  it("provides seven unique complete automation lessons with valid reset poses", () => {
    expect(LESSONS).toHaveLength(7);
    expect(new Set(LESSONS.map((lesson) => lesson.id)).size).toBe(7);
    for (const lesson of LESSONS) {
      expect(lesson.title.length).toBeGreaterThan(3);
      expect(lesson.objective.length).toBeGreaterThan(10);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(2);
      expect(lesson.observationPrompts.length).toBeGreaterThan(0);
      expect(lesson.successChecks.length).toBeGreaterThan(0);
      expect(lesson.resetJoints).toHaveLength(6);
      expect(lesson.resetJoints.every(Number.isFinite)).toBe(true);
      expect(Object.isFrozen(lesson)).toBe(true);
    }
  });

  it("cancels active animation before applying a chapter reset", () => {
    const events: string[] = [];
    const cancel = vi.fn(() => events.push("cancel"));
    const reset = vi.fn(() => events.push("reset"));
    changeLesson(LESSONS[1], cancel, reset);
    expect(events).toEqual(["cancel", "reset"]);
    expect(reset).toHaveBeenCalledWith(LESSONS[1].resetJoints);
  });
});

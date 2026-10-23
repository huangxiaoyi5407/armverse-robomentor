import type { JointVector } from "@/robotics/types";

export interface Lesson {
  readonly id: string;
  readonly chapter: number;
  readonly title: string;
  readonly objective: string;
  readonly concept: string;
  readonly steps: readonly string[];
  readonly observationPrompts: readonly string[];
  readonly successChecks: readonly string[];
  readonly resetJoints: JointVector;
}

import { z } from "zod";

const finite = z.number().refine(Number.isFinite, "数值必须有限");
const vector3 = z.tuple([finite, finite, finite]);
const quaternion = z.tuple([finite, finite, finite, finite]);
const joints = z.tuple([finite, finite, finite, finite, finite, finite]);
const safeText = z.string().trim().min(1).max(1_000).refine(
  (value) => !/```|<script|javascript:|\beval\s*\(|\bexec(?:ute)?\b/i.test(value),
  "请求包含不可执行的文本",
);

export const AgentPlanSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("move_joints"), joints, rationale: z.string().max(600) }).strict(),
  z.object({ action: z.literal("move_pose"), position: vector3, orientation: quaternion, rationale: z.string().max(600) }).strict(),
  z.object({ action: z.literal("explain"), topic: z.string().min(1).max(120), rationale: z.string().max(600) }).strict(),
]);

export const SafetyExplanationSchema = z.object({ verdict: z.enum(["approved", "blocked"]), findings: z.array(z.string().max(240)).max(12), explanation: z.string().max(800) }).strict();
export const TutorExplanationSchema = z.object({ title: z.string().min(1).max(120), explanation: z.string().min(1).max(1_200), questions: z.array(z.string().max(240)).max(4) }).strict();
export const AgentRequestSchema = z.object({ agent: z.enum(["planner", "safety", "tutor"]), prompt: safeText }).strict();

export const AgentResponseSchema = z.object({
  agent: z.enum(["planner", "safety", "tutor"]),
  mode: z.enum(["demo", "online"]),
  label: z.string().min(1).max(80),
  result: z.union([AgentPlanSchema, SafetyExplanationSchema, TutorExplanationSchema]),
}).strict();

export type AgentPlan = z.infer<typeof AgentPlanSchema>;
export type AgentRequest = z.infer<typeof AgentRequestSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;

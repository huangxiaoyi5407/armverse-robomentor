# RoboMentor UR5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reproducible Next.js teaching platform where automation-major students explore UR5 kinematics, trajectories, singularities, safety checks, and a constrained three-agent workflow.

**Architecture:** Keep robotics mathematics as framework-independent pure TypeScript modules, with Zustand owning committed simulation state and React Three Fiber rendering it. A typed workflow runs planner, deterministic validation, safety explanation, execution, and tutoring through interchangeable online and demo AI providers.

**Tech Stack:** Next.js, TypeScript, React, React Three Fiber, Three.js, Zustand, Math.js, Zod, Vitest, Testing Library, Playwright, npm.

**Spec:** `docs/superpowers/specs/2026-10-22-robomentor-ur5-design.md`

## Global Constraints

- Internal length unit is metres, angle unit is radians, and time unit is seconds; only the UI converts to millimetres and degrees.
- Robotics algorithms must be pure TypeScript modules with no React, DOM, Three.js, Zustand, or AI-provider dependency.
- Agents may emit only Zod-validated allow-listed actions and may never execute generated code.
- Deterministic safety results override every agent response.
- The application must remain demonstrable without an AI key and identify demo mode honestly.
- Target inverse-kinematics accuracy is at most 1 mm position error and 0.5 degree orientation error for reachable, non-singular fixtures.
- Dangerous, invalid, non-convergent, or interrupted operations must not commit a new robot pose.
- The project must start from a clean environment within ten minutes by following the README.
- Every task updates its matching file under `docs/competition/prompt-history/` before commit.
- Use Node.js 20.9 or newer and npm 10 or newer; commit `package-lock.json` for deterministic installation.

## Review Focus

- NaN, Infinity, wrong vector lengths, and values with wrong units must be rejected at module boundaries; Task 2 pins this with runtime-validation tests.
- Unreachable or near-singular target poses must return diagnostic failures without changing the committed pose; Tasks 5, 7, and 8 test this.
- Malformed or adversarial model output must never escape the action whitelist or become executable code; Task 10 tests retry and fallback behavior.
- Missing keys, timeout, rate limiting, and offline operation must enter labelled demo mode within 15 seconds; Tasks 10 and 11 test this.
- Chapter changes, cancelled animations, and stale asynchronous responses must not overwrite newer simulation state; Tasks 8 and 11 test cancellation tokens.

---

## Planned File Map

- `src/robotics/types.ts`: branded vectors, matrices, poses, joint configurations, results, and runtime guards.
- `src/robotics/ur5-model/model.ts`: UR5 DH parameters and joint limits.
- `src/robotics/kinematics/{transform,forward,inverse}.ts`: transforms and kinematics.
- `src/robotics/jacobian/index.ts`: geometric Jacobian, singular values, and manipulability.
- `src/robotics/trajectory/index.ts`: joint cubic/quintic and Cartesian linear planning.
- `src/robotics/safety/index.ts`: limits, workspace, singularity, and simplified collision checks.
- `src/features/simulator/`: Zustand state, procedural UR5 scene, trajectory animation, and controls.
- `src/features/lessons/`: seven lesson definitions and experiment progress.
- `src/ai/`: schemas, providers, three agents, and workflow state machine.
- `src/app/`: lab page and server-only AI route.
- `tests/`: unit, integration, and browser acceptance tests mirroring the source boundaries.
- `docs/competition/`: prompt evidence, test evidence, licensing, README inputs, and submission checklist.

### Task 1: Reproducible Project Foundation

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `.gitignore`, `.env.example`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `tests/setup.ts`, `src/app/page.test.tsx`
- Create: `docs/competition/prompt-history/001-project-foundation.md`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `lint`, `test`, `test:run`, `test:e2e`; alias `@/* -> src/*`.

- [ ] Create the minimal Next.js/TypeScript/Vitest configuration and dependency manifest, then run `npm install` to lock exact versions.
- [ ] Write `page.test.tsx` asserting the page exposes the title `RoboMentor UR5` and labelled demo-mode status.
- [ ] Run `npm run test:run -- src/app/page.test.tsx`; expect FAIL because the page shell is absent.
- [ ] Implement the smallest accessible page shell and global design tokens needed to pass.
- [ ] Run `npm run test:run`, `npm run lint`, and `npm run build`; expect all to pass.
- [ ] Record commands, dependency versions, outputs, and accepted/rejected AI suggestions in prompt record 001.
- [ ] Commit: `chore: establish reproducible Next.js foundation`.

### Task 2: Robotics Types, Units, and UR5 Model

**Files:**
- Create: `src/robotics/types.ts`, `src/robotics/ur5-model/model.ts`, `src/robotics/ur5-model/index.ts`
- Test: `src/robotics/ur5-model/model.test.ts`
- Create: `docs/competition/prompt-history/002-ur5-model.md`

**Interfaces:**
- Produces: `Vector3`, `Matrix4`, `Pose`, `JointVector`, `RobotModel`, `assertFiniteVector(values, length)`, `UR5_MODEL`.
- `UR5_MODEL` contains six immutable DH rows, six joint limits in radians, and metre-scale link dimensions.

- [ ] Write tests asserting six DH rows, six valid joint ranges, immutable data, metre-scale values, and rejection of NaN, Infinity, wrong-length vectors, and degree-like out-of-range inputs.
- [ ] Run `npm run test:run -- src/robotics/ur5-model/model.test.ts`; expect FAIL from missing exports.
- [ ] Implement the types, runtime guards, documented UR5 parameter convention, and immutable model.
- [ ] Run the focused test and full suite; expect PASS.
- [ ] Add the UR5 parameter source and licence status to `docs/competition/third-party-notices.md`.
- [ ] Update prompt record 002 and commit: `feat: define validated UR5 robot model`.

### Task 3: Homogeneous Transforms and Forward Kinematics

**Files:**
- Create: `src/robotics/kinematics/transform.ts`, `src/robotics/kinematics/forward.ts`, `src/robotics/kinematics/index.ts`
- Test: `src/robotics/kinematics/forward.test.ts`
- Create: `docs/competition/prompt-history/003-forward-kinematics.md`

**Interfaces:**
- Consumes: `RobotModel`, `JointVector`, `Pose`, `Matrix4` from Task 2.
- Produces: `dhTransform(row, angle): Matrix4`; `forwardKinematics(model, joints): { endEffector: Pose; frames: readonly Matrix4[] }`.

- [ ] Write tests for identity composition, one-link DH transform, UR5 zero fixture, a non-zero reference fixture, six returned frames, and invalid joints.
- [ ] Run the focused test; expect FAIL from missing transform functions.
- [ ] Implement matrix composition, rotation-to-pose conversion, and frame-by-frame FK without UI dependencies.
- [ ] Run focused and full tests; expect PASS with fixture tolerance documented in the test.
- [ ] Update prompt record 003 and commit: `feat: implement UR5 forward kinematics`.

### Task 4: Geometric Jacobian and Singularity Metrics

**Files:**
- Create: `src/robotics/jacobian/index.ts`
- Test: `src/robotics/jacobian/index.test.ts`
- Create: `docs/competition/prompt-history/004-jacobian-singularity.md`

**Interfaces:**
- Consumes: frames from `forwardKinematics`.
- Produces: `geometricJacobian(model, joints): Matrix6`; `singularityMetrics(jacobian): { minSingularValue: number; manipulability: number; risk: 'safe' | 'warning' | 'singular' }`.

- [ ] Write tests comparing translational columns with finite differences, checking all metrics are finite, and classifying one documented near-singular fixture.
- [ ] Run the focused test; expect FAIL.
- [ ] Implement the geometric Jacobian and SVD-derived metrics with explicit thresholds exported as constants.
- [ ] Run focused and full tests; expect PASS.
- [ ] Update prompt record 004 and commit: `feat: calculate Jacobian and singularity risk`.

### Task 5: Damped Least-Squares Inverse Kinematics

**Files:**
- Create: `src/robotics/kinematics/inverse.ts`
- Test: `src/robotics/kinematics/inverse.test.ts`
- Create: `docs/competition/prompt-history/005-inverse-kinematics.md`

**Interfaces:**
- Consumes: FK, Jacobian, joint limits, `Pose`, and initial `JointVector`.
- Produces: `solveInverseKinematics(model, target, initial, options): IKResult`, where result includes status, joints, iterations, position error, orientation error, history, and failure reason.

- [ ] Write tests for two reachable reference targets, an unreachable target, a near-singular seed, invalid input, and non-mutation of the input joint vector.
- [ ] Assert reachable fixtures meet 0.001 m and 0.5 degree thresholds after FK verification.
- [ ] Run the focused test; expect FAIL.
- [ ] Implement bounded damped least squares, joint clamping, convergence diagnostics, and a maximum-iteration exit.
- [ ] Run focused tests, then the full suite; expect PASS and no flaky random fixtures.
- [ ] Update prompt record 005 with the first substantial AI-debugging chain and commit: `feat: solve UR5 inverse kinematics numerically`.

### Task 6: Joint and Cartesian Trajectory Planning

**Files:**
- Create: `src/robotics/trajectory/index.ts`
- Test: `src/robotics/trajectory/index.test.ts`
- Create: `docs/competition/prompt-history/006-trajectory-planning.md`

**Interfaces:**
- Produces: `planJointTrajectory(start, end, options): Trajectory`; `planCartesianLine(model, start, target, options): TrajectoryResult`.
- `Trajectory` contains timestamped joint samples, poses, velocities, and completion metadata.

- [ ] Write tests for exact endpoints, monotonic timestamps, zero endpoint velocity for quintic mode, joint-limit rejection, Cartesian straightness tolerance, and graceful failure when an intermediate IK sample fails.
- [ ] Run focused tests; expect FAIL.
- [ ] Implement cubic/quintic joint interpolation and Cartesian position/orientation interpolation with seeded sequential IK.
- [ ] Run focused and full tests; expect PASS.
- [ ] Update prompt record 006 and commit: `feat: add joint and Cartesian trajectory planning`.

### Task 7: Deterministic Safety Engine

**Files:**
- Create: `src/robotics/safety/index.ts`, `src/robotics/safety/collision.ts`
- Test: `src/robotics/safety/index.test.ts`
- Create: `docs/competition/prompt-history/007-safety-engine.md`

**Interfaces:**
- Produces: `validateTrajectory(model, trajectory, environment): SafetyReport` with ordered findings and final `safe | warning | blocked` verdict.
- Environment supports axis-aligned boxes; links use documented capsule approximations.

- [ ] Write tests for safe motion, joint-limit violation, non-finite sample, unreachable workspace point, singular warning, obstacle collision, and a blocked result preserving the original committed pose.
- [ ] Run focused tests; expect FAIL.
- [ ] Implement deterministic checks and stable finding codes suitable for Agent explanations.
- [ ] Run focused and full tests; expect PASS.
- [ ] Update prompt record 007 and commit: `feat: enforce deterministic trajectory safety`.

### Task 8: Simulation Store and Procedural UR5 Scene

**Files:**
- Create: `src/features/simulator/store.ts`, `RobotScene.tsx`, `UR5Arm.tsx`, `JointControls.tsx`, `TrajectoryPlayer.tsx`
- Test: `src/features/simulator/store.test.ts`, `src/features/simulator/RobotScene.test.tsx`
- Create: `docs/competition/prompt-history/008-threejs-simulator.md`

**Interfaces:**
- Consumes: UR5 model, FK results, and validated trajectories.
- Produces: `useSimulationStore`; actions `setJoint`, `previewTrajectory`, `play`, `pause`, `cancel`, `commitCompletedTrajectory`.
- Every preview/playback carries an operation id; stale ids cannot commit state.

- [ ] Write store tests for joint updates, invalid-value rejection, cancelled playback, stale completion, and blocked trajectories not committing pose.
- [ ] Write a component test asserting six labelled joints, coordinate-frame toggle, target marker, and mode/status labels.
- [ ] Run focused tests; expect FAIL.
- [ ] Implement the store, procedural six-joint arm, scene lighting/grid, joint controls, and requestAnimationFrame playback.
- [ ] Run focused tests and full suite; expect PASS.
- [ ] Update prompt record 008 with screenshots and commit: `feat: add interactive UR5 simulation scene`.

### Task 9: Teaching Lab Shell and Seven Lessons

**Files:**
- Create: `src/features/lessons/lesson-types.ts`, `lesson-data.ts`, `LessonPanel.tsx`, `ExperimentPanel.tsx`
- Create: `src/features/control-panel/TelemetryPanel.tsx`, `MatrixPanel.tsx`
- Modify: `src/app/page.tsx`, `src/app/globals.css`
- Test: `src/features/lessons/lesson-data.test.ts`, `src/app/page.test.tsx`
- Create: `docs/competition/prompt-history/009-teaching-lab.md`

**Interfaces:**
- Produces: seven immutable `LessonDefinition` entries; each has objective, steps, observation prompts, success checks, and reset state.
- Chapter changes call `cancel()` before applying lesson reset state.

- [ ] Write tests requiring all seven unique lessons, complete instructional fields, valid reset poses, keyboard-accessible panels, and cancellation before chapter reset.
- [ ] Run focused tests; expect FAIL.
- [ ] Implement the desktop lab layout, collapsible matrices, telemetry, lesson navigation, experiment steps, and industrial dark visual system.
- [ ] Run tests, lint, and production build; expect PASS.
- [ ] Update prompt record 009 with visual decisions and commit: `feat: build seven-chapter teaching laboratory`.

### Task 10: Typed Agent Schemas and Provider Fallback

**Files:**
- Create: `src/ai/schemas.ts`, `src/ai/providers/types.ts`, `demo-provider.ts`, `online-provider.ts`, `provider-router.ts`
- Create: `src/app/api/agent/route.ts`
- Test: `src/ai/providers/provider-router.test.ts`, `src/app/api/agent/route.test.ts`
- Create: `docs/competition/prompt-history/010-agent-providers.md`

**Interfaces:**
- Produces: allow-listed `AgentPlanSchema`, `SafetyExplanationSchema`, `TutorExplanationSchema`; `AIProvider.run(request, signal): Promise<AgentResponse>`; `getProvider(env): AIProvider`.
- Server route never returns or logs API keys and imposes a 15-second abort deadline.

- [ ] Write tests rejecting unknown actions, additional executable fields, NaN/Infinity, prompt-injected code, and wrong coordinate lengths.
- [ ] Write provider tests for missing key, timeout, rate limit, malformed JSON, one retry only, explicit demo label, and cancellation.
- [ ] Run focused tests; expect FAIL.
- [ ] Implement schemas, deterministic demo fixtures, server-only online provider, router, redacted errors, and timeout fallback.
- [ ] Run focused and full tests; expect PASS.
- [ ] Update prompt record 010 and commit: `feat: add constrained AI providers with demo fallback`.

### Task 11: Three-Agent Workflow and UI Timeline

**Files:**
- Create: `src/ai/workflow.ts`, `src/ai/planner/index.ts`, `src/ai/reviewer/index.ts`, `src/ai/tutor/index.ts`
- Create: `src/features/agent-workflow/WorkflowPanel.tsx`, `workflow-store.ts`
- Test: `src/ai/workflow.test.ts`, `src/features/agent-workflow/workflow-store.test.ts`
- Modify: `src/app/page.tsx`
- Create: `docs/competition/prompt-history/011-agent-workflow.md`

**Interfaces:**
- Produces: `runTeachingWorkflow(command, snapshot, dependencies, signal): Promise<WorkflowResult>`.
- State machine: `idle -> planning -> validating -> reviewing -> executing|blocked -> explaining -> complete|failed`.

- [ ] Write integration tests for safe success, deterministic block despite approving Agent text, invalid plan fallback, AI timeout fallback, tutor grounding, abort, and stale workflow response.
- [ ] Run focused tests; expect FAIL.
- [ ] Implement the state machine so deterministic planning/safety data is immutable input to reviewer and tutor, and only safe trajectories reach the simulator.
- [ ] Implement the bottom timeline with mode label, progress, findings, retry/fallback messages, and accessible command input.
- [ ] Run focused tests, full suite, lint, and build; expect PASS.
- [ ] Update prompt record 011 with the second substantial AI-debugging chain and commit: `feat: orchestrate safe three-agent teaching workflow`.

### Task 12: Browser Acceptance, Reproduction, and Submission Evidence

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/manual-fk.spec.ts`, `tests/e2e/ik-trajectory.spec.ts`, `tests/e2e/agent-safety.spec.ts`
- Create: `README.md`, `docs/competition/submission-checklist.md`, `docs/competition/test-evidence/README.md`
- Modify: `.env.example`, `docs/competition/third-party-notices.md`, `docs/competition/对话与决策记录.md`
- Create: `docs/competition/prompt-history/012-release-verification.md`

**Interfaces:**
- Produces: one-command local startup, documented demo-mode walkthrough, repeatable full verification command, and three browser acceptance paths.

- [ ] Write Playwright tests for manual FK exploration, reachable IK/trajectory playback, and blocked unsafe Agent task with unchanged final pose.
- [ ] Run `npm run test:e2e`; expect FAIL until selectors and final integration are complete.
- [ ] Add stable accessible selectors and only the integration fixes required by the tests.
- [ ] Write README prerequisites, `npm ci`, environment setup, demo mode, startup, tests, architecture summary, originality boundary, and under-ten-minute reproduction steps.
- [ ] Run `npm ci`, `npm run test:run`, `npm run test:e2e`, `npm run lint`, and `npm run build`; save outputs under `docs/competition/test-evidence/`.
- [ ] Measure the 3D scene over a documented five-second representative playback; record hardware and confirm an average of at least 30 FPS in `docs/competition/test-evidence/README.md`.
- [ ] Perform a clean reproduction timed from README and record actual duration; if over ten minutes, fix the guide or setup before release.
- [ ] Update prompt record 012 with the third substantial AI-debugging chain and commit: `docs: complete reproducible competition release evidence`.

## Final Gate

- [ ] Confirm every spec section maps to a completed task and every prompt record references its Git commit.
- [ ] Confirm `git status --short` is empty and the complete verification command passes from a clean install.
- [ ] Run an independent whole-branch review focused on mathematical correctness, Agent safety, accessibility, third-party licensing, and competition compliance.
- [ ] Only after the gate passes, produce the 5–8 minute video script and the under-30-page technical-document outline from the verified product.


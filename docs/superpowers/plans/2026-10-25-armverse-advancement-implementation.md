# 臂境智教 A 组晋级版实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保持现有 UR5 仿真、安全门和无密钥复现能力的前提下，增加高校综合实训、可追溯实验报告、教师班级分析、PID 教学实验和低风险工业接口展示。

**Architecture:** 新增纯 TypeScript 的实训领域模型、固定合成数据、事件日志、评分、报告和控制算法；Zustand 只保存当前浏览器演示会话，React 客户端组件负责交互与打印。既有确定性安全模块继续拥有执行否决权，Agent 只解释已验证事实。

**Tech Stack:** Next.js 16.4、React 19、TypeScript、React Three Fiber、Zustand、Zod、Vitest、Testing Library、Playwright。

**Spec:** `docs/superpowers/specs/2026-10-25-armverse-advancement-design.md`

## Global Constraints

- 不使用或暗示使用真实学校、教师、班级、学生或企业生产数据。
- 固定合成数据必须确定性、可重算，并显示“教学演示合成数据，不代表真实学生表现”。
- 不声称进行了学生试用、问卷调查或教学效果验证。
- 机器人算法、评分、控制和报告事实使用纯 TypeScript，不能依赖 React、DOM、Three.js 或 AI Provider。
- AI 不得虚构指标、覆盖确定性安全结果或直接执行代码。
- 动力学必须标注为教学简化模型，不用于真实机械臂选型或安全控制。
- 无 API 密钥、无账号、无数据库和无 ROS 2 环境时仍可完整演示。
- 保持 Node.js 20.9+、十分钟复现、现有在线演示和细粒度 Git 历史。
- 每个任务完成后立即运行验收、更新进度台账并提交；不得把多个阶段压缩成一次提交。

## 五小时执行窗口

- **第 1 小时：** Task 1 合成教学数据与可重算指标。
- **第 2 小时：** Task 2 实训会话、事件日志和稳定错误码。
- **第 3 小时：** Task 3 综合实训 UI 与错误溯源。
- **第 4 小时：** Task 4 可打印实验报告。
- **第 5 小时：** Task 5 教师工作台、全量回归、阶段部署和恢复记录。
- **下一额度窗口：** Task 6—10。若前一任务超时，优先保证测试、提交和台账，下一任务顺延，不留下未验证代码。

## Review Focus

- 合成数据被误读为真实数据：所有学生列表、看板和报告必须同时显示数据声明。
- 刷新或切换模式导致事件与报告错配：每条事件必须携带稳定的 sessionId，报告只读取指定会话。
- Agent 返回与确定性事实矛盾：报告与讲解只接受经过 schema 校验的事实引用，最终安全状态来自 SafetyReport。
- 空日志、重复事件和乱序时间戳：评分与指标必须确定性处理并给出明确结果。
- 大量合成记录降低页面性能：班级指标必须一次纯函数聚合，组件不能在渲染中生成随机数据。

---

## 第一波：五小时内可交付闭环

### Task 1: 合成教学数据与班级指标

**Files:**
- Create: `src/training/types.ts`
- Create: `src/training/synthetic-data.ts`
- Create: `src/training/analytics.ts`
- Test: `src/training/synthetic-data.test.ts`
- Test: `src/training/analytics.test.ts`
- Create: `docs/competition/prompt-history/013-synthetic-training-data.md`

**Interfaces:**
- Produces: `TrainingTask`, `TrainingStudent`, `TrainingSessionSummary`, `TrainingClass`.
- Produces: `SYNTHETIC_CLASS`, `SYNTHETIC_DATA_NOTICE`.
- Produces: `calculateClassMetrics(sessions): ClassMetrics` and `groupTrainingErrors(sessions): readonly ErrorGroup[]`.

- [ ] Write failing tests proving the dataset has one class, 30 unique synthetic students, three tasks, deterministic IDs, valid metric ranges and an explicit synthetic-data notice.
- [ ] Run `npm run test:run -- src/training/synthetic-data.test.ts`; expect failure because the modules do not exist.
- [ ] Implement immutable fixed records without `Math.random`, personal names, school names or external data.
- [ ] Write failing analytics tests for empty input, completion rate, mean attempts, mean safety score, error grouping and deterministic ordering.
- [ ] Implement single-pass metric aggregation with finite-value validation.
- [ ] Run both focused tests and `npm run test:run`; expect all tests to pass.
- [ ] Record data provenance and rejected “real data” claims in prompt record 013.
- [ ] Commit: `feat: add transparent synthetic training dataset`.

### Task 2: 实训会话、事件日志与评分

**Files:**
- Create: `src/training/events.ts`
- Create: `src/training/scoring.ts`
- Create: `src/features/training-session/training-store.ts`
- Test: `src/training/events.test.ts`
- Test: `src/training/scoring.test.ts`
- Test: `src/features/training-session/training-store.test.ts`
- Create: `docs/competition/prompt-history/014-training-event-trace.md`

**Interfaces:**
- Produces: `TrainingEventCode`, `TrainingEvent`, `TrainingSession` and `appendTrainingEvent(session, event): TrainingSession`.
- Produces: `scoreTrainingSession(session): TrainingScore`, containing total, safety, completion, efficiency and deductions.
- Produces: `useTrainingStore` actions `startSession`, `recordEvent`, `attachSafetyReport`, `completeSession`, `resetSession`.
- Consumes: simulator operation IDs and stable `SafetyFinding.code` values; does not replace simulator state.

- [ ] Write failing tests for append-only events, monotonic timestamps, stable session IDs, immutable input and rejection of non-finite snapshots.
- [ ] Implement validated event creation and ordering without wall-clock dependence in pure functions.
- [ ] Write failing score tests for safe completion, blocked collision, singular warning, repeated invalid attempts and empty session.
- [ ] Implement a documented 100-point rubric where safety deductions cannot be cancelled by efficiency bonuses.
- [ ] Write failing store tests for stale session writes, reset isolation and completed-session immutability.
- [ ] Implement the Zustand session adapter and wire no UI yet.
- [ ] Run focused tests and `npm run test:run`; expect all tests to pass.
- [ ] Update prompt record 014 and commit: `feat: trace and score training sessions`.

### Task 3: 柔性制造综合实训与错误溯源 UI

**Files:**
- Create: `src/features/training-session/TrainingTaskPanel.tsx`
- Create: `src/features/training-session/EventTracePanel.tsx`
- Create: `src/features/training-session/TrainingWorkspace.tsx`
- Test: `src/features/training-session/TrainingWorkspace.test.tsx`
- Modify: `src/features/simulator/IKTargetControls.tsx`
- Modify: `src/features/agent-workflow/WorkflowPanel.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Create: `docs/competition/prompt-history/015-flexible-manufacturing-lab.md`

**Interfaces:**
- Consumes: `useTrainingStore`, `useSimulationStore`, `TrainingTask`, workflow outcome and SafetyReport.
- Produces: accessible “课程实验 / 综合实训” workspace switch and event filters.
- Existing simulator and workflow components receive optional event callbacks; defaults preserve current behavior and tests.

- [ ] Write a failing component test that starts the flexible-manufacturing task, records a blocked challenge, filters the trace and displays the synthetic-data notice.
- [ ] Run the focused test; expect failure because the workspace does not exist.
- [ ] Implement the task card, fixed pickup/inspection/drop-off steps and explicit completion conditions.
- [ ] Connect target solve, trajectory playback, safety block and reset to the current session through narrow callbacks.
- [ ] Implement severity/type filters and “原因—依据—修正” explanations derived from stable error codes.
- [ ] Add the workspace switch without removing the existing seven lessons.
- [ ] Run focused tests, full tests, lint and build; expect all to pass.
- [ ] Update prompt record 015 and commit: `feat: add flexible manufacturing training workspace`.

### Task 4: 可追溯实验报告

**Files:**
- Create: `src/training/report.ts`
- Create: `src/features/training-report/TrainingReport.tsx`
- Create: `src/features/training-report/ReportActions.tsx`
- Test: `src/training/report.test.ts`
- Test: `src/features/training-report/TrainingReport.test.tsx`
- Modify: `src/app/globals.css`
- Create: `docs/competition/prompt-history/016-training-report.md`

**Interfaces:**
- Produces: `buildTrainingReport(session, task): TrainingReportModel`.
- Every report metric contains a `sourceEventIds` list; no metric without trace evidence may be rendered.
- `ReportActions` invokes `window.print()` only after a completed session and exposes a printable report view.

- [ ] Write failing pure tests for evidence-linked metrics, empty/incomplete sessions, deterministic score and synthetic-data declaration.
- [ ] Implement the immutable report builder using Task 2 scoring and event facts.
- [ ] Write failing component tests for report sections, safety findings, evidence IDs, boundary disclaimers and disabled print before completion.
- [ ] Implement accessible report markup and print CSS; do not add a PDF dependency or server endpoint.
- [ ] Run focused tests, full tests, lint and build; expect all to pass.
- [ ] Update prompt record 016 and commit: `feat: generate traceable training reports`.

### Task 5: 教师工作台与第一波发布检查点

**Files:**
- Create: `src/features/teacher-dashboard/TeacherDashboard.tsx`
- Create: `src/features/teacher-dashboard/ClassMetrics.tsx`
- Create: `src/features/teacher-dashboard/ErrorDistribution.tsx`
- Test: `src/features/teacher-dashboard/TeacherDashboard.test.tsx`
- Test: `tests/e2e/training-classroom.spec.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `docs/competition/submission-checklist.md`
- Modify: `docs/competition/对话与决策记录.md`
- Create: `docs/competition/prompt-history/017-teacher-dashboard.md`

**Interfaces:**
- Consumes: `SYNTHETIC_CLASS`, `calculateClassMetrics`, `groupTrainingErrors` and report view.
- Produces: accessible “学生实验台 / 教师工作台” mode switch and drill-down by synthetic student/session.

- [ ] Write a failing dashboard test for synthetic-data notice, recomputed metrics, sorted error categories, needs-support list and selected-session drill-down.
- [ ] Implement semantic HTML/SVG charts without a new chart dependency.
- [ ] Write a failing browser test covering student task start, blocked error trace, successful completion/report and teacher drill-down.
- [ ] Add stable accessible selectors and only the integration fixes required by the browser test.
- [ ] Run `npm run test:run`, `npm run test:e2e`, `npm run lint`, `npm run build` and `git diff --check`.
- [ ] Record exact counts and the first-wave completion checkpoint in project evidence and decision log.
- [ ] Commit: `feat: add classroom training and teacher analytics`.
- [ ] Push and deploy only after the user-authorized external side effect gate; verify the production URL with Playwright.

---

## 第二波：A 组技术增强

### Task 6: PID 单关节教学实验

**Files:**
- Create: `src/control/pid.ts`
- Create: `src/control/metrics.ts`
- Create: `src/features/control-lab/PIDLab.tsx`
- Test: `src/control/pid.test.ts`
- Test: `src/features/control-lab/PIDLab.test.tsx`
- Modify: `src/app/page.tsx`, `src/app/globals.css`
- Create: `docs/competition/prompt-history/018-pid-control-lab.md`

**Interfaces:**
- Produces: `simulatePID(config, plant, setpoint): PIDSimulationResult` with timestamped setpoint, output, error and control samples.
- Produces: `calculateControlMetrics(samples): ControlMetrics` containing overshoot, steadyStateError, riseTime and settlingTime.

- [ ] Write failing tests for stable, under-tuned, over-tuned, integral windup-limited and invalid parameter cases.
- [ ] Implement fixed-step deterministic PID with explicit output and integral limits.
- [ ] Write failing UI tests for parameter controls, presets, metrics, chart labels and boundary copy.
- [ ] Implement the PID lab using accessible SVG curves and no random noise.
- [ ] Run full verification, update prompt record 018 and commit: `feat: add PID control teaching lab`.

### Task 7: 教学级负载、摩擦与惯性模型

**Files:**
- Create: `src/control/plant.ts`
- Test: `src/control/plant.test.ts`
- Modify: `src/control/pid.ts`
- Modify: `src/features/control-lab/PIDLab.tsx`
- Modify: `src/features/control-lab/PIDLab.test.tsx`
- Create: `docs/competition/prompt-history/019-lightweight-dynamics.md`

**Interfaces:**
- Produces: `stepTeachingJointPlant(state, inputTorque, parameters, dt): JointPlantState`.
- Parameters contain finite positive inertia, non-negative viscous friction, Coulomb friction and payload contribution.

- [ ] Write failing tests for zero input, heavier payload, higher damping, invalid parameters and bounded finite simulation.
- [ ] Implement the documented teaching plant and connect it to PID simulation.
- [ ] Add UI controls and the exact “教学简化模型” disclaimer.
- [ ] Run full verification, update prompt record 019 and commit: `feat: model teaching load and friction effects`.

---

## 第三波：接口、证据与参赛材料

### Task 8: ROS 2 轨迹导出与设备网关模拟

**Files:**
- Create: `src/integration/ros2.ts`
- Create: `src/integration/device-gateway.ts`
- Create: `src/features/integration-lab/IntegrationPanel.tsx`
- Test: `src/integration/ros2.test.ts`
- Test: `src/integration/device-gateway.test.ts`
- Test: `src/features/integration-lab/IntegrationPanel.test.tsx`
- Create: `docs/competition/prompt-history/020-industrial-interfaces.md`

**Interfaces:**
- Produces: `toJointTrajectoryMessage(trajectory): JointTrajectoryMessage` using six UR5 joint names and sec/nanosec durations.
- Produces: pure gateway reducer states `disconnected | connecting | connected | emergency-stop | fault`.

- [ ] Write failing serialization and state-transition tests, including invalid samples and commands during emergency stop.
- [ ] Implement JSON export and deterministic simulated heartbeat/telemetry controls.
- [ ] Add explicit “接口模拟，未连接真实机械臂” copy and prevent bypass of approved trajectories.
- [ ] Run full verification, update prompt record 020 and commit: `feat: demonstrate safe industrial interfaces`.

### Task 9: 晋级版完整验收与竞赛证据

**Files:**
- Create: `tests/e2e/pid-lab.spec.ts`
- Create: `tests/e2e/report-print.spec.ts`
- Modify: `README.md`
- Modify: `docs/competition/test-evidence/README.md`
- Modify: `docs/competition/third-party-notices.md`
- Modify: `docs/competition/submission-checklist.md`
- Create: `docs/competition/prompt-history/021-advancement-verification.md`

- [ ] Add browser acceptance for PID preset differences, report provenance, synthetic-data disclosure and interface safety state.
- [ ] Run clean `npm ci` and the complete unit, browser, lint, build, audit and FPS checks.
- [ ] Update ten-minute reproduction steps and all evidence counts.
- [ ] Run an independent whole-branch review focused on math, data claims, Agent grounding, accessibility and competition compliance.
- [ ] Fix Critical/Important findings test-first, then commit: `docs: verify ArmVerse advancement release`.
- [ ] Push, deploy and independently verify the canonical production URL.

### Task 10: 最终参赛材料

**Files:**
- Create: `docs/competition/submission/video-script-6min.md`
- Create: `docs/competition/submission/technical-document-outline.md`
- Create: `docs/competition/submission/judging-highlights.md`
- Modify: `docs/competition/submission-checklist.md`

- [ ] Write a six-minute 1080p Mandarin script covering problem, product, safe/unsafe contrast, report, teacher dashboard, PID, evidence and originality.
- [ ] Reserve at least two minutes for reproducible AI collaboration and Prompt/Git evidence.
- [ ] Map a maximum 30-page technical document to verified code, tests and screenshots only.
- [ ] Create a one-page judging highlights sheet with no unsupported real-world claims.
- [ ] Verify every screenshot and number against the production build, then commit: `docs: prepare ArmVerse competition submission`.

## 恢复规则

- 进度写入 `.superpowers/sdd/2026-10-25-armverse-advancement-implementation/progress.md`。
- 只有包含 `Task N: complete` 的任务才视为完成；重启后从第一个未完成任务继续。
- 每个任务的提交、测试命令和结果都写入台账。
- 若额度临近耗尽，停止开启新任务，完成当前测试、提交、台账和 `git status` 检查后再暂停。

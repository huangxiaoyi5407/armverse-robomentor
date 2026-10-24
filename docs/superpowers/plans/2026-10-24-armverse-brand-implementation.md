# 臂境智教品牌统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将参赛作品的当前对外品牌统一为“臂境智教”，同时保留历史开发证据中的旧名称。

**Architecture:** 仅修改展示文案、Next.js 静态元数据、npm 包标识和当前提交材料。历史 Prompt、设计与实施记录保持原样，GitHub 仓库已完成重命名。

**Tech Stack:** Next.js 16.4、React 19、TypeScript、Vitest、Playwright

**Spec:** `docs/superpowers/specs/2026-10-24-armverse-brand-design.md`

## Global Constraints

- 正式全称：`臂境智教——基于数字孪生与多智能体协同的UR5机械臂教学实验平台`。
- 仓库 slug 与 npm 包标识：`armverse-robomentor`。
- 历史 Prompt、旧设计文档和旧实施计划不改名。
- 不修改功能与视觉布局，不操作其他仓库。

## Review Focus

- 页面 `<h1>` 与浏览器标题必须同时使用“臂境智教”。
- README 克隆地址必须指向 `huangxiaoyi5407/armverse-robomentor`。
- `package.json` 与锁文件根包名必须一致。
- 历史证据仍能解释旧名称与新品牌的关系。
- 更名不得破坏三条浏览器验收路径。

---

### Task 1: 用户界面与包标识

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: 现有首页标题与 Next.js `Metadata` 导出。
- Produces: 用户可见标题“臂境智教”和包标识 `armverse-robomentor`。

- [ ] **Step 1:** 先修改 `page.test.tsx`，断言一级标题为“臂境智教”，运行该测试并确认旧实现失败。
- [ ] **Step 2:** 更新页面与元数据文案，更新 npm 包及锁文件根名称。
- [ ] **Step 3:** 运行页面测试、完整单元测试和 lint，确认通过。

### Task 2: 当前参赛入口材料

**Files:**
- Modify: `README.md`
- Modify: `docs/competition/submission-checklist.md`
- Modify: `docs/competition/对话与决策记录.md`

**Interfaces:**
- Consumes: 已确认的正式全称与最终仓库 URL。
- Produces: 评委当前入口所见的一致项目名称、复现地址和品牌变更记录。

- [ ] **Step 1:** 更新 README 标题、简介和 clone URL。
- [ ] **Step 2:** 在对话与决策记录追加品牌定稿，保留旧记录原文。
- [ ] **Step 3:** 标记仓库地址检查项完成，并运行链接/文本检查。
- [ ] **Step 4:** 运行生产构建与三条 Playwright 验收路径。
- [ ] **Step 5:** 提交并推送独立品牌定稿提交。

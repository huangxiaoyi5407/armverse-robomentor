# 021 — 晋级版完整验收与竞赛证据

> Git evidence: included in the task commit `docs: verify ArmVerse advancement release`.

## 目标提示

对阶段 1—8 的晋级版功能做干净依赖复现、全量单元/组件测试、真实 Chrome 验收、lint、生产构建、生产依赖审计和帧率检查，并让 README、测试证据和提交清单只引用本次实际输出。

## 新增浏览器验收

- PID 欠调、稳定、过调三种预设产生不同指标，并显示教学动力学边界与末态遥测。
- 完成的实训报告显示事件证据 ID、合成数据声明，并实际调用浏览器打印动作。
- 工业接口页面在未连接时禁用导出，连接后允许已审批轨迹，急停后再次禁用。

## 本次复现结果

- `npm ci`：22 秒安装 497 个包。
- `npm run test:run`：31 个测试文件、184 项通过。
- `npm run test:e2e`：8 项真实 Chrome 验收通过，代表性五秒帧率 58.3 FPS。
- `npm run lint`、`npm run build`、`git diff --check`：通过。
- `npm audit --omit=dev`：0 个生产依赖漏洞。
- 完整审计中的 3 个告警位于 Vitest 开发依赖链；未使用会强制升级主版本的 `npm audit fix --force`。

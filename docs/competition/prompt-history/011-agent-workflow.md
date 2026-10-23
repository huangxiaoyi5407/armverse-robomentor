# 011 — 三 Agent 安全教学工作流

## 目标提示

实现规划 Agent、安全讲解 Agent、教学 Agent 的串行协作，并以可访问时间线展示全过程。模型负责理解和解释，轨迹生成与安全放行必须由确定性机器人算法完成；只有 `approvedTrajectory` 可以进入仿真状态。

## 状态与责任边界

- 状态机：planning → validating → reviewing → executing/blocked → explaining → complete。
- 规划 Agent 的结构化动作再次经过 schema 校验；无效输出回退到确定性 Demo 计划。
- 限位、工作空间、位姿一致性、碰撞和奇异性由安全内核判定。
- 安全 Agent 即使输出“批准”也不能覆盖 `blocked` 报告。
- 教学 Agent 的提示只接收命令、最终 verdict、finding codes 和已验证样本数。
- operationId 防止旧请求完成后覆盖较新的用户任务。

## AI 调试链

最初风险是让安全 Agent 的自然语言结论参与放行。测试构造了覆盖整个工作区的障碍物，同时让 Agent 文本返回 approved；工作流最终仍保持 blocked、轨迹为 null。随后将 `SafetyReport.approvedTrajectory` 固定为进入仿真状态的唯一通道，并把确定性 findings 作为只读事实传给教学 Agent。

## TDD 证据

- RED：workflow 与 UI store 模块不存在，测试无法加载。
- GREEN：安全成功、确定性阻断、事实落地、无效计划回退、取消和陈旧响应测试通过。
- 回归：全量测试、ESLint 与 Next.js 生产构建通过。

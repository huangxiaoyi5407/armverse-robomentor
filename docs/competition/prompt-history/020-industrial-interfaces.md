# 020 — ROS 2 轨迹导出与设备网关模拟

> Git evidence: included in the task commit `feat: demonstrate safe industrial interfaces`.

## 目标提示

为晋级版增加低风险、可离线复现的工业接口教学实验：将已审批轨迹导出为 ROS 2 `JointTrajectory` 兼容 JSON，并用纯状态机演示设备连接、握手、心跳、轨迹排队、急停、故障和复位。

## 接口与安全边界

- 固定使用 UR5 六关节标准名称，轨迹点包含位置、速度以及 `sec/nanosec` 时间。
- 序列化拒绝空样本、非有限值、错误关节维度、负时间和乱序时间戳。
- 网关状态为 `disconnected / connecting / connected / emergency-stop / fault`，急停或故障期间不能发送心跳或轨迹命令。
- 只有与确定性 `SafetyReport.approvedTrajectory` 同一对象的轨迹可进入队列，接口层不能自行提升或替换轨迹。
- 页面精确标注“接口模拟，未连接真实机械臂”，不声称存在 ROS 2、WebSocket 或真实 UR5 连接。

## TDD 证据

序列化、状态转换和界面测试先因模块与入口不存在失败；实现后聚焦测试覆盖 ROS 时间转换、非法样本、连接与心跳、急停命令阻断、未审批轨迹拒绝、故障复位，以及页面披露和入口切换。

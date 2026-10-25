# 臂境智教

**臂境智教——基于数字孪生与多智能体协同的 UR5 机械臂教学实验平台**

面向自动化类专业学生，对应“数字孪生与轻量具身智能仿真”方向。项目把三维交互、正逆运动学、雅可比与奇异性、轨迹规划、确定性安全检测和三 Agent 教学工作流放在一个无需云端密钥也可完整演示的 Web 应用中。

**在线演示：** <https://armverse-robomentor.vercel.app>

## 10 分钟内启动

环境要求：Node.js 20.9+、npm 10+、支持 WebGL 的 Chrome 或 Edge。

```powershell
git clone https://github.com/huangxiaoyi5407/armverse-robomentor.git
cd armverse-robomentor
npm ci
Copy-Item .env.example .env.local
npm run dev
```

打开 <http://localhost:3000>。不填写任何密钥即进入明确标注的 `Demo 演示模式`；七章课程、综合实训、可追溯报告、教师看板、PID 与轻量动力学、工业接口模拟均可使用。

## 五分钟演示路线

1. 拖动“关节 1”，观察三维姿态、末端 XYZ、奇异性和 4×4 矩阵同步变化。
2. 点击“求解逆运动学并预览”，再点击“播放轨迹”，观察状态从预览变为完成。
3. 切换左侧七章课程，确认正在运行的轨迹会先取消，再装载该章姿态。
4. 在“三 Agent 教学工作流”启动普通指令，观察规划、确定性校验、安全解释和教学解释时间线。
5. 勾选“启用安全挑战障碍物”后再次启动，确认危险轨迹被阻断且机械臂最终姿态不变。
6. 切换“综合实训”，完成任务并查看带证据 ID 和合成数据声明的可打印报告，再进入教师工作台查看班级指标。
7. 切换“PID 控制实验”，比较欠调、稳定和过调预设，并调整惯量、负载与摩擦参数。
8. 切换“工业接口实验”，观察连接、心跳、急停状态，并确认只有已审批轨迹可导出为 ROS 2 兼容 JSON。

## 可选在线 AI

`.env.local` 可配置兼容 Chat Completions JSON 响应的服务：

```dotenv
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

密钥只在服务端读取，不返回浏览器。缺少密钥、限流、超时或畸形 JSON 会回退到 Demo；用户主动取消不会启动隐藏回退任务。模型只提供受 Zod 白名单约束的计划与解释，任何动作仍须经过确定性机器人算法和安全门。

## 验证

```powershell
npm run test:run
npm run test:e2e
npm run lint
npm run build
```

端到端测试默认调用本机 Chrome，覆盖运动学、轨迹、安全 Agent、综合实训与教师追溯、PID 响应、报告打印和工业接口急停。详细结果见 `docs/competition/test-evidence/README.md`。

## 架构

- `src/robotics`：独立于 React 的 UR5 模型、正逆运动学、雅可比、轨迹和安全纯函数。
- `src/features/simulator`：React Three Fiber 场景、关节/IK 控件和仿真状态机。
- `src/ai`：严格 schema、在线/Demo Provider、规划/安全/教学三 Agent 编排。
- `src/features/lessons`：面向自动化专业的七章实验内容。
- `src/training`：固定合成教学数据、事件、评分、分析与可追溯报告纯函数。
- `src/control`：通用 PID、控制指标及教学级单关节负载/摩擦/惯性模型。
- `src/integration`：ROS 2 兼容序列化与不可绕过安全审批的设备网关状态机。
- `docs/competition`：Prompt 历史、对话决策、第三方说明、测试证据和提交清单。

## 原创性边界

运动学、数值逆解、雅可比、插值、安全规则和 Agent 编排均在本仓库独立实现。UR5 外形采用代码生成的教学简化几何体，不含厂商 CAD、图片、Logo 或文档内容。仅使用并注明厂商公开的事实性 DH 尺寸与关节范围；依赖与来源见第三方说明。

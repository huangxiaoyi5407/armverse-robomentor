# 测试与复现证据

记录日期：2026-10-23（Asia/Shanghai）。以下结果在 Windows、Node.js 20.9+ 项目基线上取得。

## 自动化验证

| 命令 | 结果 |
| --- | --- |
| `npm run test:run` | 14 个测试文件、126 个测试通过 |
| `npm run test:e2e` | 3 条 Chrome 验收路径通过 |
| `npm run lint` | 通过，零 warning |
| `npm run build` | 通过；静态首页及动态 `/api/agent` 路由生成成功 |
| `npm audit --omit=dev` | 生产依赖 0 个已知漏洞 |

浏览器验收覆盖：手动关节改变并实时更新 FK；可达 IK 目标生成安全轨迹并完成播放；覆盖工作区的挑战障碍物阻断 Agent 轨迹且最终关节值不变。

## 五秒代表性帧率

- 场景：打开三维 UR5，求解默认可达 IK 目标并播放 3 秒轨迹，继续观察至满 5 秒。
- 方法：真实 Chrome 页面通过 `requestAnimationFrame` 统计五秒窗口。
- 最终复验结果：295 帧 / 5007.4 ms，平均 **58.9 FPS**，达到至少 30 FPS 的验收目标（此前一次为 59.0 FPS）。
- 环境：Intel64 Family 6 Model 197 Stepping 2；32 GB 内存；Intel Arc 140T GPU（系统报告 16 GB）；Chrome 156.0.8078.47。

Three.js 输出一条 `THREE.Clock` 已弃用警告，来自依赖内部，不影响功能或验收结果。

## 干净复现

- 在清理后的依赖目录执行锁文件驱动的 `npm ci`：**19.1 秒**，成功安装 497 个包。
- Next.js 开发服务器实测约 0.6 秒报告 Ready；即使计入克隆、复制环境文件和手动打开浏览器，明显低于 10 分钟要求。
- 首次沙箱内计时因 DNS 隔离失败，未计入结果；上述 19.1 秒来自允许联网后的成功执行（退出码 0）。

完整 `npm audit` 的 14 个告警均位于 ESLint/Vitest 等开发依赖链；生产依赖审计为 0。未采用可能破坏 Next.js 16 工具链的 `npm audit fix --force`，后续可在兼容升级窗口更新 Vitest 与 lint 栈。

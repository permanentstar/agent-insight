---
id: "lane-runtime"
title: "Lane 历史：状态分派、进程链与恢复边界"
subject: "pi-lane"
status: "frozen-source"
baselines: ["pi-lane-20260916"]
sources: ["pi-lane", "pi-session"]
depends_on: ["lane-architecture", "pi-evolution"]
evidence: ["source", "historical-document"]
verified_scope: "冻结提交核验 Drive 分派与 Radius 接入口；进程协议/故障矩阵结合原稿整理，未运行历史栈。"
---

# Lane 历史：状态分派、进程链与恢复边界

旧 Lane 的持久状态由 Session/Lane/Operation 所有，Drive 只拥有本进程的推进权。远程 Client 不能把 JavaScript Harness 对象搬到自己进程；它通过服务命令和复制视图观察 Worker。

![Presentation 连接 Coordinator 或 Radius 后进入 Server，attachment 路由到 Worker；Worker 内 Drive 根据持久 Operation 状态推进模型与工具](../../assets/lane-runtime.svg)

| 运行对象 | 构造与 owner | 权威状态 / 生命周期 |
|---|---|---|
| Session | Worker 打开 storage 与写锁 | 持久 Lane/Operation/transcript；单 owner 写入 |
| Harness | Worker 的运行容器 | 包装一个 Session 的策略与运行服务 |
| Lane | Session 内命名会话分支 | 已提交投影、open Operation |
| Operation | accept 后的用户意图 | 持久状态机；跨 Drive 重建 |
| Drive | 本进程认领 Operation | gate、取消与执行控制；不持久化代码栈 |
| Turn | 一次模型轮次 | 一个 Operation 可有多轮；不等同输入命令 |

## Drive 的完整分派面

`driveOperation` 先核验 Drive 对应当前 Operation，运行 before_drive，循环 reread 已提交状态，再分派。每次 handler 返回后重新检查，不能拿第一次读出的 operation 一直推进。

| Operation state | 实际处理器 | 解释 |
|---|---|---|
| starting | startRun | 固定开始配置与接纳消息 |
| checkpoint | runCheckpoint | 判定是否继续模型、工具或结束 |
| assistant.ready / retry_wait | runGeneration | 生成/重试等待 |
| assistant.effect_pending | recoverAssistantGeneration | 外部请求结果未知后的恢复 |
| tools | runTools | intent → effect → settlement，不把调用体放事务内 |
| deferred.suspended / effect_pending | runDeferred | 暂停与外部 deferred 结果边界 |
| summary.deciding / ready / effect_pending / retry_wait | structural decision/generation/recovery/retry | 结构性摘要同样需要恢复状态 |
| navigation.ready_to_commit | commitNavigation | 分支导航的提交阶段 |
| 状态与控制需协调 | reconcileOperation | 先核验当前状态/意图；不是无条件重跑 |

证据：[Drive 状态分派](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/agent/src/harness/runtime/drive.ts#L29)、[工具准备/执行/结算](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/agent/src/harness/execution/tools.ts#L78)。工具执行前固定最终参数和意图，结束后核销；中断后的未知效果不直接重做。steer、followUp、nextRun 分别作用于运行/轮次/下一 run 边界，abort 结束工作、finish 完成终态、resume 重建推进权，不能互换。

## 从命令入口到 Worker

历史 server 入口确保 Coordinator，持有启动锁与逻辑 serverId，创建 generation Backend、SessionWorkerManager、服务 Host，监听并注册，再接管已有 Worker、发布 Session 目录。两个锁分别协调本机服务启动和 Session 写入，不提供跨主机共享 storage 的高可用。

Client-runtime 先解析 routes：显式 connect 单 route；自动发现只找本地 Unix servers，可冷启动独立 Server 子进程。连接所有候选后选择 session 并 attach。非交互 client 完成一次结果即 dispose；TUI 长期持有复制状态与重新 attachment。旧非交互路径没有 TUI 的 continue/resume 选择语义，不能凭同名 CLI flag 推断等价。

| 协议层 | 拥有 | 不应解释为 |
|---|---|---|
| Radius relay | WebSocket 逻辑连接复用、字节序与背压 | Agent/Operation 协议 |
| Pi protocol | hello/version、CBOR frame、request correlation、cancel、subscription | 工具或业务命令语义 |
| Client / Server attachment | 临时 Session 路由与租约 | Session 对象跨进程共享 |
| Chord | Service call/catalogue 与 state snapshot/update | transport、认证或存储 |
| Coordinator private control | generation、peer、Worker 交接 | 公共 Pi RPC 或数据库 |

本地与远程在 RadiusRelayHost 调同一 Server.accept 时汇合，随后复用 attachment 与 Worker 路由。[历史 Server 组合根](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/coding-agent/src/experimental/server.ts)、[Client-runtime](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/coding-agent/src/experimental/client-runtime.ts)、[远程汇合点](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/coding-agent/src/experimental/radius-relay.ts#L262)。

## 故障与资源回收

| 事件 | 持久事实 | 可重建/未知部分 |
|---|---|---|
| Client 断开 | Operation 仍可能在 Worker 推进 | attachment 与 state replica 重建，不自动重发旧命令 |
| Server generation 替换 | Worker/Session 可继续持有 | peer、目录、demand 与 Chord proxy 重新绑定 |
| Worker 崩溃 | 最后成功 commit | 模型/工具 effect 未核销结果可能未知 |
| Session 锁被占用 | 单写者约束 | 新 Worker 拒绝并行打开，不自动抢锁 |
| 所有 hold 消失 | 没有新工作 | idle/orphan grace 后关闭，活动 Operation 仍是 hold |

ServerLifetime 与 WorkerLifecycle 综合连接/活动工作/临时 hold；不是无前台就立刻退出。插件按 session/tui 分别构建与加载 bundle，各 Host 有独立实例；manifest/hash 校验不等于插件代码 sandbox。旧版本的计时默认值留在固定源码，不提升成跨版本契约。

本页仅冻结历史机制；Lane 没成为默认生产入口，正文不把 API 导出、实验 server 运行与产品转正混称。[路线演进](evolution.md) 保留其退出与 Pico5 替换的证据。

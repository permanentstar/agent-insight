---
id: "codex-plan"
title: "Codex：线程运行、轮次快照与执行边界"
subject: "codex"
status: "verified-source"
baselines: ["codex-20261009"]
sources: []
depends_on: []
evidence: ["source"]
verified_scope: "Rust core 的线程构造、提交分派、run_turn、工具路由和 rollout 入队/确认已静态核验；未覆盖桌面宿主、全部 feature 和恢复模式。"
---

# Codex：线程运行、轮次快照与执行边界

Codex 开源 core 把活跃线程、一次用户轮次、一次模型请求和持久历史分别建模。宿主通过 ThreadManager 创建或加载 CodexThread，core Session 接收操作并驱动 SessionTask；run_turn 再驱动模型与工具循环。旧官方使用实践只能说明使用约定，本章以固定 Rust 源码重建这些关系。

![Codex 接入层经 ThreadManager 创建活跃 Thread 与 Session，任务经 turn/step 进入模型和工具，rollout 与 ContextManager 分担持久与请求投影](../../assets/codex.svg)

## 层次与概念词典

| 概念 | 层次与职责 | 创建者 / 生命周期 | 状态边界 |
|---|---|---|---|
| ThreadManager | 宿主接入 core 的活跃线程管理 | 宿主构造并传入共享服务 | 管理活对象，不等于全部历史文件 |
| CodexThread | 双向操作/事件门面 | manager 创建或加载 | 持有 Arc Session 与 SessionIo |
| Session / SessionIo | 线程运行状态及队列接口 | Session::spawn 建立 | 历史、服务、active_turn 与输入队列在内存 |
| SessionTask | 一次受控运行任务 | Session.start_task 安装并持取消 token | Regular 等任务类型；不是通用 durable Task 记录 |
| TurnContext | 用户轮次的配置、身份与环境边界 | 轮次创建时构造 | 多次模型请求可共享同一 turn |
| StepContext | 当前采样的模型、tool router、环境快照 | 每个请求边界捕获 | 防止把下一次动态配置混进当次请求 |
| ModelClientSession | turn 内的 provider 连接/路由状态 | run_turn 创建或复用预热实例 | 与用户 Thread 的持久身份不同 |
| ContextManager | 活跃历史及模型输入投影 | Session 持有 | 可以截断或替换；不是原始 rollout 原封不动发送 |
| RolloutRecorder | 后台历史写入器 | 启动时按新建/恢复参数构造 | AddItems 队列与 flush ack 分开 |

依据：[Thread 门面](https://github.com/openai/codex/blob/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4/codex-rs/core/src/codex_thread.rs#L208)、[manager](https://github.com/openai/codex/blob/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4/codex-rs/core/src/thread_manager.rs#L251)、[Session 构造](https://github.com/openai/codex/blob/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4/codex-rs/core/src/session/mod.rs#L520)。ThreadId、运行 SessionId、rollout 与 Git branch 不能互相替代；线程 fork 的历史关系须读实际 lineage 元数据。

## 构造、复用与一次轮次

ThreadManager 的 spawn_thread 调 Session::spawn，注入配置、认证、模型、environment、thread store、扩展与初始历史，再包装为 CodexThread。SessionIo 把 Submission 送入队列。submission_loop 分派 Op：普通输入、Interrupt、shutdown、审批回复等并非同一个模型 prompt。活线程可保持多轮；冷启动要依据 InitialHistory 和持久资料重建。

| 当前位置 | 调用链 / 执行点 | 状态与返回 |
|---|---|---|
| 接入 core | ThreadManager.spawn_thread → Session::spawn | 创建运行状态、服务和操作/事件接口 |
| 接纳操作 | SessionIo.submit → submission_loop | 根据 Op 分派；中断与审批可直接改变控制状态 |
| 安装任务 | Session.spawn_task → start_task | spawn_task 先中止被替换任务；start_task 建立取消 token 与 active turn |
| 准备轮次 | RegularTask → run_turn | 前置压缩、接纳输入、skills/plugins、hook 与上下文准备 |
| 当次采样 | StepContext → ModelClientSession.stream | 当前 history 投影、模型与 tool specs 形成请求 |
| 工具执行 | ToolRouter → registry → handler/runtime | 按调用类型处理结果，再反馈到循环 |
| 收口 | 任务结束、事件与持久写入 | 事件展示、history 更新和 rollout 确认各有边界 |

依据：[spawn_thread](https://github.com/openai/codex/blob/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4/codex-rs/core/src/thread_manager.rs#L2022)、[操作分派](https://github.com/openai/codex/blob/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4/codex-rs/core/src/session/handlers.rs#L439)、[任务安装](https://github.com/openai/codex/blob/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4/codex-rs/core/src/tasks/mod.rs#L272)、[run_turn](https://github.com/openai/codex/blob/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4/codex-rs/core/src/session/turn.rs#L164)、[provider 请求](https://github.com/openai/codex/blob/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4/codex-rs/core/src/session/turn.rs#L2565)。等待界面的结束不自动等于 task 中止；控制必须进入 Op/取消路径。

## 历史、压缩与持久确认

`record_prepared_conversation_items` 先给历史项补元数据，更新内存 history，再转为 RolloutItem 交持久路径。RolloutRecorder.record_canonical_items 返回表示 AddItems 已进入后台队列；persist/flush 通过 oneshot ack 等待 writer 确认。不能把这两类 await 说成相同的落盘保证，本章也没有实测断电耐久性。

压缩通过活动历史替换及持久 compaction 资料影响后续请求；上下文指令、用户消息和工具输出不会按所有 JSONL 行直接拼接。原始日志顺序也不能单独证明逻辑覆盖范围或 conversation branch。依据：[历史写入](https://github.com/openai/codex/blob/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4/codex-rs/core/src/session/mod.rs#L3596)、[历史替换](https://github.com/openai/codex/blob/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4/codex-rs/core/src/session/mod.rs#L4116)、[writer 接口](https://github.com/openai/codex/blob/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4/codex-rs/rollout/src/recorder.rs#L1048)。

## 工具、审批与 sandbox

ToolRouter 区分 model-visible specs、code mode 的嵌套工具身份和 registry；工具出现在 schema 不代表已经获准执行。执行工具的 ToolOrchestrator 解析审批需求，取得审批决定，选择 sandbox attempt，再调用 ToolRuntime.run；是否能再次尝试受有效权限及失败类型限制。不同工具的网络、文件、动态工具边界并不都归同一个 shell sandbox。

| 边界场景 | 当前静态证据 | 不应扩大成的保证 |
|---|---|---|
| 新任务替换活任务 | spawn_task 先 abort_all_tasks(Replaced) | 已启动进程与外部系统副作用可撤销 |
| 取消模型请求 | stream 被 cancellation_token 包裹 | provider 已做的计算或费用被撤回 |
| 工具请求可见 | ToolRouter.exposes_tool / model_visible_specs | approval 或 sandbox 已放行 |
| 写入排队后进程崩溃 | AddItems 与确认分开 | 每个 UI 事件都已持久 |
| 重启恢复历史 | InitialHistory / rollout 等资料用于重建 | 任意进程内 SessionTask 都能续跑或工具恰好一次 |

依据：[工具路由](https://github.com/openai/codex/blob/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4/codex-rs/core/src/tools/router.rs#L85)、[效果编排](https://github.com/openai/codex/blob/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4/codex-rs/core/src/tools/orchestrator.rs#L127)。本章是执行路径定位，不是全平台安全审计。

## 取舍、独有内容与覆盖限制

TurnContext/StepContext 让长活线程与动态模型/工具配置能够共存，代价是读源码时不能把这些 context 都当成同一对象。code mode、插件、MCP、子 Agent 和远端 environment 各有组合入口，应沿 router/handler 继续下钻。完整 compaction 覆盖规则、现代 agent runtime 的持久工作机制、全部 shell runtime 与线程 lineage 留待专章，不据本章有限的 SessionTask 观察断言整个 Codex 没有持久工作能力。

[旧官方实践](official-practices.md) 保留为历史文档观点；开源 core、app-server 和桌面宿主分别解释，本文不把桌面 App 私有实现写成开源事实。

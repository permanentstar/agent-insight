---
id: "durable-architecture"
title: "Pico5：事务、任务与副作用恢复"
subject: "pi-durable"
status: "verified-source"
baselines: ["pi-20261009"]
sources: []
depends_on: ["durable-glossary"]
evidence: ["source", "official"]
verified_scope: "Task 恢复、工具 intent/replay 与 Session 提交顺序静态核验；未做 crash 注入及实际存储耐久性测试。"
---

# Pico5：事务、任务与副作用恢复

Pico5 把进行中的工作表示为持久 Task。Session 先提交记录，再让外部观察到状态；模型和工具副作用仍在事务之外，不能因此保证外部世界恰好执行一次。

![实验 TUI/Worker 经 Harness 接纳 Submission，scheduler 推进任务，Session 事务提交，Storage 保存](../../assets/pico5.svg)

| 当前位置 | 上层调用者 | 下层执行者 | 权威状态与副作用 |
|---|---|---|---|
| 接纳层 | durable TUI / Worker | Conversation.submit / Submissions | 接纳记录持久保存 |
| 调度层 | Harness resume / wait | TaskScheduler、GenerationTask、ToolTask | Task record 是恢复点，运行代码不是 |
| 提交层 | TaskRuntime.commit | Session.commit / Storage.commit | 事务统一提交 entry、task 和 document |
| 副作用层 | Task phase | model stream / tool.execute | 不处于 Session 事务；需未知结果恢复策略 |

应用用 Harness.open 组合 Storage、Models 与 Registry。Conversation 的 root 首次建立并持久配置。用户输入 submit 后得到 Submission；生成任务 pi.generation 请求模型，拥有这一轮的 pi.tool 子任务，再在工具完成后决定下一轮。旧 Lane Operation 的专用状态分派由通用 Task 模型承担，但两套状态 schema 不兼容。

TaskScheduler 在 open 恢复 surviving running Task 为 pending，并保留 checkpoint；load 本身不 dispatch，后续 resume 才启动推进。Session commit 在 mutation line 上完成准备、存储与状态采用后再通知，因此记录与 Document 的发布顺序是契约的一部分。Storage 的耐久性仍取决于 Memory、JSONL fsync 或 SQLite 配置。

工具成功路径分成校验和 beforeTool、提交 intent、调用 execute、核销结果。intent 包含最终 arguments 和 replay 声明，执行效果不会被 SQL/JSONL 事务回滚。

| 崩溃/取消位置 | 已提交状态 | 恢复或控制结果 |
|---|---|---|
| intent 之前 | 尚未接纳本次工具效果 | 按任务已保存状态继续；不能凭展示推定效果发生 |
| intent 之后、outcome 之前 | phase=execute 与 arguments/replay | 存储策略与当前工具策略均 safe 才重跑 |
| 工具非安全或定义改变 | 可能已有外部部分效果 | 记录 interrupted 错误及已提交部分输出，不盲目重放 |
| 调用者取消 wait | 工作已接纳 | 停止等待；工作取消必须调用相应 abort |

实际工具恢复检查是“保存的 replay 和当前 tool.replay 同时 safe”，不是只读历史标签。可见进度按提交发布，但未提交的外部效果依然可能存在。

证据：[工具 intent 与恢复](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/tool.ts#L52)、[Session 提交](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/session/session.ts)、[scheduler 恢复](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/scheduler.ts#L238)、[Harness 门面](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/harness.ts)。官方 [实验服务接口说明](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/experimental/services/README.md) 列明 navigate/nextRun/resume、子会话服务暴露及 transcript paging 的接口缺口。持久内核中的任务、分支和恢复能力，需要另外接入产品服务才能被前端使用。

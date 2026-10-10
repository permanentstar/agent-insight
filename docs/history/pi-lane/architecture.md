---
id: "lane-architecture"
title: "Lane：概念层次与一条工作主线"
subject: "pi-lane"
status: "frozen-source"
baselines: ["pi-lane-20260916"]
sources: ["pi-lane"]
depends_on: []
evidence: ["source"]
verified_scope: "冻结基线的对象层次、命令提交与 Drive 主线静态核验；非最新实现，未运行恢复测试。"
---

# Lane：概念层次与一条工作主线

Lane 模型把持久工作的身份与进程内推进分开：Operation 保存“什么工作、执行到哪”，Drive 决定这次进程怎样继续。读流程前先区分这两者。

![冻结 Lane 的五层：产品 Worker、Harness/Lane、持久 Operation、内存 Drive、Session/Storage](../../assets/lane.svg)

| 术语 | 层次 / owner | 生命周期与关系 |
|---|---|---|
| AgentHarness | Session 的运行门面 | 一个 Harness 可取得多条命名 Lane |
| Lane | 一个处理道的进程内 actor | 拥有 tip、配置、inbox 与当前 operation 的投影；命令经 Session 串行提交 |
| Operation | 持久工作身份 | run、compaction、navigation 等工作，跨进程恢复；不等于一个模型 turn |
| OperationState | 持久推进位置 | 保存直接状态分支，如 assistant.effect_pending、tools |
| Drive | 内存执行器 | Lane 拥有，推进当前 Operation；进程丢失后新建，不持久保存 Promise |
| Session / mutator | 事务与存储边界 | 提交 entries 与工作状态；负责存储一致性 |

| 当前位置 | 上层 | 下层 | 状态归属 |
|---|---|---|---|
| Lane 命令 | Controller / Harness 使用者 | Session.mutate 与 planner | commit 后采用 Lane.state |
| Drive 分派 | Lane 当前工作 | phase procedures | 检查当前 operation，不自立第二套权威存储 |
| effect procedure | Drive | model/tool | intent 前后分开；outcome 未知须恢复 |

createAgentHarness 恢复 Session 并返回 open operations，本身不启动模型、工具、hook 或计时副作用。命令接纳进入 Session mutation，planner 形成提交决定；mutator.commit 完成后更新 Lane.state，再发相应事件。

Drive 根据当前状态选择 startRun、checkpoint、generation、tool batch、deferred polling、summary 或 navigation 的过程。过程先准备输入、提交 intent，再做 effect 和提交 outcome。恢复重新走持久状态指定的路径，不靠之前 JavaScript Promise 的完成值。

证据：[Harness 构造](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/agent/src/harness/runtime/harness.ts)、[Lane 命令提交](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/agent/src/harness/runtime/lane.ts#L328)、[Drive 分派](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/agent/src/harness/runtime/drive.ts#L33)。当前实现中这些文件已删除，必须使用固定旧 SHA 阅读。本章只覆盖这条代表主线；旧全套 RPC、状态叶与存储迁移未逐项转写。

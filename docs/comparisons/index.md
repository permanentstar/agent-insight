---
id: "comparison-index"
title: "横向比较入口与范围"
subject: "comparison"
status: "index"
baselines: ["pi-20261009", "deerflow-20261009", "codex-20261009", "hermes-20261009", "langchain-20261009", "langgraph-20261009", "deepseek-20261009", "claude-source-20260331"]
sources: ["comparison-legacy"]
depends_on: ["comparison-reference", "comparison-matrix", "comparison-modes", "comparison-ownership", "comparison-control", "comparison-context", "comparison-state", "comparison-execution", "comparison-observability", "comparison-business"]
evidence: ["source", "historical-document", "static-inference"]
verified_scope: "九对象的定位与七个机制专题；源码静态机制、历史转述与候选设计分开，无运行或性能排名。"
---

# 横向比较入口与范围

本书比较九个对象：Pi AgentSession 与 Pi Durable 分开讨论，LangChain 与 LangGraph 分别代表构图层和执行层。先选择共同问题，再沿各对象的机制向下阅读。比较表中的能力带有明确条件，取舍也需要放回具体场景判断。

## 从闭环进入七个研究问题

先读共同架构，手工算出工具结果怎样进入下一请求；再读执行模式，区分语义决定与程序推进。随后从所有权、资料、状态、效果和证据逐层深入。每个专题先把过程讲完整，再对照九个对象；矩阵供查阅定位，各对象分册供追到真实代码。

| 共同问题 | 页面 | 覆盖 |
|---|---|---|
| 一项工作怎样成为模型、动作和反馈的闭环 | [共同架构](common-model.md) | 从最小循环到职责分层、控制表示与组合取舍 |
| 应用、框架、实验分别处于哪层 | [对象矩阵](matrix.md) | 定位、入口、驱动器与基线 |
| ReAct、规划执行和固定编排如何区分 | [执行模式](execution-modes.md) | 同一任务、模式层次、实际入口与支持程度 |
| 谁构造谁、谁持有活动工作 | [所有权](ownership.md) | owner、复用、长期身份与运行实例 |
| 理解、规划和委派由谁决定 | [决策与控制](control-delegation.md) | 显式接纳、模型循环、child/activation、候选 Router 取舍 |
| 模型读到什么，摘要何时生效 | [Prompt 与压缩](context-compaction.md) | 历史/投影/memory、逻辑覆盖、提交资格 |
| 恢复历史、工作还是外部效果 | [状态与恢复](state-recovery.md) | 提交边界、未知结果和同一故障 |
| 定义如何到真实执行 | [执行边界](execution.md) | 可见性、校验、授权、hook、并发和取消 |
| 看见、保存和交付各证明什么 | [观测与交付](observability-delivery.md) | run tree、事件、持久确认、业务验收和 ACK |
| 上述机制怎样组成一项业务服务 | [从 Agent 循环到业务系统](agent-in-business.md) | 开放决策、运行进度、业务事实与产品验收的交接 |

各专题采用相同的比较结构：解释共同问题与完整过程，用正常任务演算数据交接，给出代表实现的关键路径，再汇总各对象与必要中断条件下的取舍。产品、框架与运行内核的职责不同，因此按场景讨论适用性，不给一个跨层次总分。

完成机制专题后，业务系统篇用同一项 CSV 修复服务把这些职责重新组合起来。共同架构帮助理解反馈闭环，业务系统篇帮助作出产品设计判断；随后进入对象分册，检验各实现怎样承担这些职责。durable 是其中一个代表案例，跨框架归纳不以某个方案为默认终点。

请求封装、显式路由、独立规划和交付确认可以作为设计选择，但需要说明它们解决的具体问题。它们不自动成为所有对象共有的模块。[Lane 历史附录](../history/pi-lane/index.md)则提供另一种持久工作编排的参照。

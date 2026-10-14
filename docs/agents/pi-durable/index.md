---
id: "durable-index"
title: "Pico5 / pi-durable 分册"
subject: "pi-durable"
status: "index"
baselines: ["pi-20261009"]
sources: []
depends_on: ["durable-glossary", "durable-architecture", "durable-loop", "durable-documents"]
evidence: []
verified_scope: "入口按共同职责定位并连接实现专题；正文的静态证据、历史范围与教学核验各自说明。"
---

# Pico5 / pi-durable 分册

Pico5 把进行中的模型与工具工作表示为持久 Task，用事务对齐历史、任务状态和可观察资料。本分册词典先给对象定位，架构章解释一次持久工作如何推进，执行章沿 CSV 修复任务串起五步；上下文章再解释记录怎样分别提供给界面和模型。

## 在共同架构中定位

先把本实现放到[共同职责地图](../../comparisons/common-model.md)，再沿下面的章节追到实际对象。这里对齐的是问题，具体类型和作用域仍按本分册解释。

| 共同职责 | 本实现中的定位 |
|---|---|
| 产品宿主 | 应用打开 Harness，Conversation 接纳 Submission。 |
| 工作推进 | GenerationTask/ToolTask 保存阶段，TaskScheduler 按 Registry 推进。 |
| 模型与动作 | 生成在事务外请求模型；工具 Task 先保存意图，再执行效果。 |
| 历史与请求 | Entry 保存贡献，ContextView 选择范围；Task 和 Document 另表述工作与视图。 |
| 扩展与控制 | 任务定义、hooks、Document 与接纳边界组织应用策略。 |

## 分册阅读

| 阅读顺序 | 要回答的问题 |
|---|---|
| [概念词典](glossary.md) | Entry、Task、Document、Submission 与运行句柄各指什么？ |
| [事务与 Task 状态机](architecture.md) | status 和 phase 有什么区别？提交与工具效果怎样分工？ |
| [一项任务怎样推进](loop.md) | 一份输入为什么对应多个 generation？工具结果怎样回到模型？ |
| [Document 与上下文](documents.md) | 当前状态、模型输入和摘要采用怎样协作？ |

建议对照 [AgentSession 循环](../pi/loop.md)阅读。两者都保留模型按观察选择动作的反馈机制，工作推进在进程与持久记录中的表示不同。模式层面的共同概念见[执行模式比较](../../comparisons/execution-modes.md)。

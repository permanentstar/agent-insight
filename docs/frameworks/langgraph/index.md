---
id: "langgraph-index"
title: "LangGraph 分册"
subject: "langgraph"
status: "index"
baselines: ["langgraph-20261009"]
sources: ["langchain-stage4"]
depends_on: ["langgraph-migrated", "langgraph-advanced"]
evidence: []
verified_scope: "入口按共同职责定位并连接实现专题；正文的静态证据、历史范围与教学核验各自说明。"
---

# LangGraph 分册

LangGraph 将图定义编译为可执行计算，以超步调度任务、合并 channel 写入并保存 checkpoint。图定义、活动 Loop 和持久 thread 身份各有生命周期。

## 在共同架构中定位

[共同职责地图](../../comparisons/common-model.md)先说明每项工作需要谁承担职责。本框架提供其中的组合与执行能力，应用层再补自己的语义和生命周期。

| 共同职责 | 框架中的定位 |
|---|---|
| 图定义 | StateGraph 注册 schema、节点、边和 reducer。 |
| 工作推进 | 每次调用创建 Loop，以超步选择任务、执行和合并写入。 |
| 模型与动作 | 节点可以运行模型、工具或程序；框架不规定语义决策策略。 |
| 状态与恢复 | channels、checkpoint、pending writes 和 thread 寻址共同提供资料。 |
| 产品责任 | Prompt、具体能力、执行授权与业务完成条件由应用定义。 |

## 分册阅读

| 章节 | 要回答的问题 |
|---|---|
| [超步与 checkpoint](architecture.md) | tick、runner、writes 和 saver 怎样推进一次调用？ |
| [合并与恢复边界](advanced.md) | Overwrite、Delta、Command、子图和 interrupt 分别改变什么？ |

先用超步章理解一次调用的选择、执行、合并与保存，再用进阶章解释并发写、动态路由、子图和人工继续输入。两章共用同一个状态推进模型，具体模型与工具策略由上层应用补足。

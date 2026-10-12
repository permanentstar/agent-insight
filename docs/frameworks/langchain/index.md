---
id: "langchain-index"
title: "LangChain 分册"
subject: "langchain"
status: "index"
baselines: ["langchain-20261009"]
sources: ["langchain-overview", "langchain-stage1", "langchain-stage2", "langchain-stage3", "langchain-stage5", "langchain-stage6"]
depends_on: ["langchain-migrated", "langchain-components", "langchain-retrieval", "langchain-observability", "langchain-learning"]
evidence: []
verified_scope: "入口按共同职责定位并连接实现专题；正文的静态证据、历史范围与教学核验各自说明。"
---

# LangChain 分册

LangChain 统一组件调用与数据契约，再用 create_agent 把模型、工具和中间件组成图。Runnable/LCEL 解释组件组合，LangGraph 则承担图执行和恢复。

## 在共同架构中定位

[共同职责地图](../../comparisons/common-model.md)先说明每项工作需要谁承担职责。本框架提供其中的组合与执行能力，应用层再补自己的语义和生命周期。

| 共同职责 | 框架中的定位 |
|---|---|
| 调用与构图 | Runnable、模型/消息/工具协议及 create_agent。 |
| 工作推进 | 产生标准图和 middleware 节点，运行交给 LangGraph。 |
| 语义资料 | AgentState.messages 与当次 ModelRequest 分开。 |
| 能力与组合 | Tool、Retriever、模型、middleware 可以参与固定流或动态循环。 |
| 产品责任 | 身份、业务验收、存储和交付由调用应用组合。 |

## 分册阅读

| 章节 | 要回答的问题 |
|---|---|
| [Agent 构图](architecture.md) | create_agent 怎样生成 model/tools/hook 节点与路由？ |
| [组件契约](components.md) | Runnable、消息、模型和 Tool 如何约束输入输出？ |
| [检索增强](retrieval.md) | 固定检索、Agentic RAG 和混合流程由谁控制？ |
| [回调与 Partner](observability.md) | 父子 trace 怎样传递，invoke 最后进入哪个 provider？ |
| [学习路线](learning.md) | 如何用练习检验协议、状态和集成的理解？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。

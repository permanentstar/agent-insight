---
id: "langchain-index"
title: "LangChain 分册"
subject: "langchain"
status: "index"
baselines: ["langchain-20261009"]
sources: ["langchain-overview", "langchain-stage1", "langchain-stage2", "langchain-stage3", "langchain-stage5", "langchain-stage6"]
depends_on: ["langchain-migrated", "langchain-components", "langchain-retrieval", "langchain-observability", "langchain-learning"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# LangChain 分册

LangChain 统一组件调用与数据契约，再用 create_agent 把模型、工具和中间件组成图。Runnable/LCEL 解释组件组合，LangGraph 则承担图执行和恢复。

| 章节 | 要回答的问题 |
|---|---|
| [Agent 构图](architecture.md) | create_agent 怎样生成 model/tools/hook 节点与路由？ |
| [组件契约](components.md) | Runnable、消息、模型和 Tool 如何约束输入输出？ |
| [检索增强](retrieval.md) | 固定检索、Agentic RAG 和混合流程由谁控制？ |
| [回调与 Partner](observability.md) | 父子 trace 怎样传递，invoke 最后进入哪个 provider？ |
| [学习路线](learning.md) | 如何用练习检验协议、状态和集成的理解？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。

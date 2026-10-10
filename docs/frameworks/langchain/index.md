---
id: "langchain-index"
title: "LangChain分册"
subject: "langchain"
status: "index"
baselines: ["langchain-20261009"]
sources: ["langchain-overview", "langchain-stage1", "langchain-stage2", "langchain-stage3", "langchain-stage5", "langchain-stage6"]
depends_on: ["langchain-migrated"]
evidence: []
verified_scope: "分册入口与已核验章节对应；正文静态范围与未覆盖内容见下表。"
---

# LangChain分册

LangChain 提供 Runnable、消息、模型和工具协议，并用 create_agent 构图。它与负责运行/恢复的 LangGraph 分册配合阅读。

阅读顺序：[统一协议、Agent 构图与 hook 顺序](architecture.md)。先看图和词典，再跟主链路定位表进入执行点。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| 统一调用接口、model/tools 路由和主干 middleware 顺序已静态核验。 | 旧六阶段教程只归并主题；RAG、tracer 及所有 Partner/练习代码未逐项运行。 |

所有对象采用[统一模板](../../templates/project.md)。基线以正文 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期是 2026-10-09；无真实模型或故障运行测试。

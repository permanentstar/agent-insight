---
id: "langgraph-migrated"
title: "LangGraph：构图、调度与持久状态"
subject: "langgraph"
status: "migrated-unverified"
baselines: []
sources: ["langchain-stage4"]
depends_on: []
evidence: ["historical-document"]
verified_scope: "已拆出独立框架问题；Stage 4 的最新源码机制仍待核验。"
---

# LangGraph：构图、调度与持久状态

LangGraph 分册重点不是再次罗列 LangChain API，而是解释图被构造以后由谁驱动，以及状态如何跨执行保存。旧 Stage 4 提供学习入口，当前实现仍待核验。

| 层次 | 术语与职责 | 必须回答的边界 |
|---|---|---|
| 构图 | StateGraph、node、edge、compile | schema 与边决定什么，运行时何时创建 |
| 运行时 | Pregel、channel、superstep | 节点调度、并行结果与消息合并 |
| 执行控制 | interrupt、Command、resume | 停止当前执行与下一次恢复的关系 |
| 持久层 | checkpointer、checkpoint namespace、store | 临时实例、图状态、跨会话数据不混用 |

源码入口已找到 libs/langgraph/langgraph/graph/state.py、pregel/main.py 和 libs/checkpoint/langgraph/checkpoint/base/__init__.py。构图完成不等于模型已执行；checkpoint 保存成功也不自动保证外部工具效果唯一执行。

独有专题保留 channels/reducer 与 checkpoint schema，比较时对应共同问题“状态合并”与“崩溃恢复”，而不是把所有图节点称作 Agent。

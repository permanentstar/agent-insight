---
id: "deerflow-index"
title: "DeerFlow分册"
subject: "deerflow"
status: "index"
baselines: ["deerflow-20261009"]
sources: ["deerflow-runtime", "deerflow-middleware", "deerflow-prompt", "deerflow-harness"]
depends_on: []
evidence: ["historical-document"]
verified_scope: "已建立分册与目标基线；正文最新源码核验未完成。"
---

# DeerFlow分册

应用在上层选择 Agent 产品语义与 Harness 能力，LangChain 构图，LangGraph/Pregel 驱动执行。旧分析重点是 Gateway run 与 graph instance 分离。

本分册按照 [统一对象模板](../../templates/project.md) 组织。读 [初版整理](architecture.md) 时，先核对状态条；旧材料的具体机制尚未逐条复核最新基线。

| 章节方向 | 本版状态 |
|---|---|
| 定位、层次、概念与所有权 | 已整理研究入口；正式词典待源码核验后补齐 |
| 构造、一次请求与执行点 | 下页保存旧材料的主链路问题；最新源码待核验 |
| 状态、上下文、工具与权限 | 不把旧实现自动认作当前行为 |
| 故障、取消、恢复与独有机制 | 以统一边界表继续深化 |

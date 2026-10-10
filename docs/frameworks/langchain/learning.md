---
id: "langchain-learning"
title: "LangChain / LangGraph：学习路线与原稿校正"
subject: "langchain"
status: "verified-source"
baselines: ["langchain-20261009", "langgraph-20261009"]
sources: ["langchain-overview", "langchain-stage1", "langchain-stage2", "langchain-stage3", "langchain-stage4", "langchain-stage5", "langchain-stage6"]
depends_on: ["langchain-components", "langchain-retrieval", "langchain-observability", "langgraph-advanced"]
evidence: ["source"]
verified_scope: "学习材料按六阶段合并；API 边界与固定源码对照，外部课程质量、历史发布统计和教学练习未实测。"
---

# LangChain / LangGraph：学习路线与原稿校正

学习按“调用协议 → 数据契约 → 检索 → 图执行 → 观察 → 端到端集成”推进。本书以 Python 源码为研究范围，因为 DeerFlow 使用这条组合；这不是对 TS 生态完备度或优劣的判断。

![统一调用协议提供节点能力，create_agent 生成状态图，Pregel 推进节点，Partner 执行模型，回调观察全链](../../assets/framework-components.svg)

| 阶段 | 要回答的问题 | 正文与源码阅读 | 原练习如何保留 |
|---|---|---|---|
| 1 Runnable / LCEL | 谁拥有执行顺序？流式从哪里开始？ | [组件契约](components.md)：base.py 的 invoke、Sequence、Parallel | 三种模型输入、去掉 parser、顺序错误、缓冲步骤、async 默认；按行为问题保留 |
| 2 Messages / Model / Tool | 原始负载与标准视图区别？schema 谁验证？ | [消息与工具](components.md)：messages、chat_models、BaseTool | tool_call_id、text/reasoning、schema 错误、结构化输出能力；不硬编码厂商假设 |
| 3 Retrieval | 谁决定检索？文档来源是否还在？ | [RAG](retrieval.md)：Embeddings、store、retriever | 切块、索引、两类调用路线；不把服务返回当召回质量 |
| 4 Graph / Agent | 并发写如何合并？恢复会重跑哪里？ | [主链路](../langgraph/architecture.md)、[状态边界](../langgraph/advanced.md) | 两节点、并发 reducer、Command、middleware、子图；先读合并规则再做恢复练习 |
| 5 Observability | 谁传 parent_run_id？后端在哪层挂？ | [回调与 tracing](observability.md) | trace、标签、跨链继承、DeerFlow 注入；不等同运行日志或事务 |
| 6 Partner | 公共 invoke 最后到哪个 SDK 分支？ | [Partner](observability.md)、[create_agent](architecture.md) | 最小模型、能力测试、工厂导入；基础调用与工具能力分别验证 |

每阶段的“自检”统一为四问：对象由谁构造，输入输出是什么，实际执行在哪里，失败/恢复边界是什么。旧文的按天学习建议属于个人安排，本书不把 3 天、7 天或 30 天变成技术完成标准。阅读结束以能解释这些问题为准，练习执行仍需独立记录环境与结果。

## 原稿的重要校正

| 原表述 | 本版处理 | 原因/证据 |
|---|---|---|
| “社区 80% 教程过时” | 删除统计；识别 API 与版本即可 | 原稿没有统计样本，不当事实 |
| “Python 最全、TS 忽略” | 改为本书研究范围选择 | 未做两生态清单比较 |
| “旧 API 全废” | 改为旧路线不作为 v1 Agent 主线，迁移查对应包 | 存在 classic 与不同用途，不能把历史 API 一概说不存在 |
| “RAG 固定、Agent 自主” | 拆固定、Agentic、混合 | 资料增强与控制权是两个维度 |
| “LastValue 后写覆盖” | 同超步多值拒绝 | [LastValue.update](https://github.com/langchain-ai/langgraph/blob/bfcfea554ed5c7f7be562cebf8825e911b493ab1/libs/langgraph/langgraph/channels/last_value.py#L56) |
| “Command 替代条件边” | Command 是动态发送/更新能力，现有边仍需检查 | [Command](https://github.com/langchain-ai/langgraph/blob/bfcfea554ed5c7f7be562cebf8825e911b493ab1/libs/langgraph/langgraph/types.py#L833) 与 StateGraph 控制分支 |
| “每个 middleware 都变成节点” | 状态 hooks 编为节点，wrap hooks 组合调用 | [create_agent 构图](architecture.md) |
| “任何模型支持 tools / structured” | 具体 Partner 的能力契约 | [bind_tools 基类](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/core/langchain_core/language_models/chat_models.py#L2366) |
| “DeerFlow 无向量库 / 仅一处 StateGraph” | 只保留被核验的调用点，不保留全仓永久否定 | 产品增长会改变搜索范围；当前正文明确基线 |

原稿的外部课程、中文资源、平台历史命名及发布日期留在 archive，未作为当前选型依据。学习问题、代表实现、练习目的已全部落到上述章节；可验证正文不依赖在线原稿或私有机器路径。

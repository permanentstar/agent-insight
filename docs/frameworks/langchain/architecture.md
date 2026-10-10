---
id: "langchain-migrated"
title: "LangChain：统一调用协议与 Agent 构图"
subject: "langchain"
status: "verified-source"
baselines: ["langchain-20261009"]
sources: ["langchain-overview", "langchain-stage1", "langchain-stage2", "langchain-stage3", "langchain-stage5", "langchain-stage6"]
depends_on: []
evidence: ["source", "historical-document"]
verified_scope: "Runnable 接口、create_agent 图结构与 hook 顺序、模型/工具协议边界已静态核验；教程练习、partner 网络请求和观测后端未执行。"
---

# LangChain：统一调用协议与 Agent 构图

LangChain 是应用组合框架。Runnable 统一调用形态，messages/model/tool 统一协议对象，create_agent 把标准的模型与工具循环编成 LangGraph 图。它没有另建一套独立于 LangGraph 的图调度器。阅读时先区分构图、节点内调用和底层 provider 请求。

![LangChain 的 create_agent 生成节点与边，compiled graph 由 LangGraph 驱动，BaseChatModel 与 BaseTool 把请求交给 partner 和 handler](../../assets/langchain.svg)

## 概念与生命周期

| 概念 | 层次与含义 | owner / 生命周期 | 状态边界 |
|---|---|---|---|
| Runnable / LCEL | 通用 invoke、batch、stream 及组合协议 | 组合时形成对象；调用时传 RunnableConfig | 不自动提供业务会话持久化 |
| BaseMessage / AIMessage / ToolMessage | 带角色、内容及 tool call 关系的协议数据 | 应用、模型与工具节点生产 | content、内容块和纯文本视图不同 |
| BaseChatModel | 模型调用抽象 | 应用构造或 init_chat_model 解析 | provider 的实际网络代码在 partner |
| BaseTool | schema、校验、调用及结果包装 | 应用/工厂注入工具实例 | _run/_arun 执行副作用 |
| AgentState | 图节点共享的业务状态 schema | 工厂合并应用/middleware schema | 通过 LangGraph channels 更新 |
| Runtime.context | 当前调用注入的环境 | 调用者提供 | 与持久 State 分开 |
| AgentMiddleware / ModelRequest | hook 定义 / 当次模型请求 | middleware 在构图时提供；request 每模型节点创建 | override 请求不等于持久修改 State |
| CompiledStateGraph | 构图结果及执行门面 | create_agent 最后 compile 返回 | 运行由 LangGraph 提供 |

依据：[Runnable](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/core/langchain_core/runnables/base.py#L134)、[ChatModel](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/core/langchain_core/language_models/chat_models.py#L475)、[BaseTool](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/core/langchain_core/tools/base.py#L433)、[factory](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/langchain_v1/langchain/agents/factory.py#L892)。

## 构造与一次请求

create_agent 收集工具、middleware 的额外工具与 schema，形成 ToolNode、model 节点和 hook 节点，添加条件边，注入 checkpointer/store/cache 后 compile。调用 compiled graph 才开始执行；是否跨调用保留状态取决于应用是否配置存储和 thread 寻址。

| 当前位置 | 调用 / 产物 | 控制关系 |
|---|---|---|
| 构图 | create_agent → StateGraph → compile | 不触发模型采样 |
| 输入 | graph.invoke / ainvoke / stream | LangGraph 将输入和恢复状态送给节点 |
| 模型节点 | model_node / amodel_node → ModelRequest | 从 state.messages 取消息，加当次 model/tools/system 信息 |
| 模型包裹 | wrap_model_call 链 → _execute_model_* | 可以改请求、重试、短路；进入终端 handler 才调模型 |
| 模型执行 | bind model → invoke / ainvoke | system_message 在此与 messages 组合 |
| 工具与继续 | ToolNode → 包裹调用 → BaseTool | ToolMessage 回填；有工具则通常回 loop_entry_node |
| 结束 | 无工具、结构化响应、return_direct 或跳转 | 不把任何成功 node 等同整个 agent 已结束 |

依据：[模型节点与真实调用](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/langchain_v1/langchain/agents/factory.py#L1493)、[构图](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/langchain_v1/langchain/agents/factory.py#L1611)、[工具返回路由](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/langchain_v1/langchain/agents/factory.py#L2072)。

## Hook 顺序与状态更新

| Hook | 编排方式 | 列表 A、B 的顺序 | 返回值影响 |
|---|---|---|---|
| before_agent | 入口图节点 | A → B，仅本次 graph 调用入口 | State 更新或允许的跳转 |
| before_model | 每次模型节点前的图节点 | A → B | 可变更下个节点读取的 State |
| wrap_model_call | 模型终端调用包裹 | A 进入 → B 进入 → 模型 → B 返回 → A 返回 | 当次 request / response；并非独立图节点 |
| after_model | 模型后的图节点 | B → A | State、跳转，决定进 tools 或结束 |
| wrap_tool_call | 工具 handler 包裹 | 首项最外层 | 可短路、重试或规范化工具结果 |
| after_agent | 收尾图节点 | B → A | 在 END 前收口；不是所有工具各跑一次 |

源码通过边直接表达 after 的反序，而不是简单对每个方法调用一遍。hook 的 dict 是状态写入，不是立即修改所有对象；request.override 只改变指定请求。依据：[wrap 合成](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/langchain_v1/langchain/agents/factory.py#L281)、[前后节点边](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/langchain_v1/langchain/agents/factory.py#L1715)、[after 反序与 compile](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/langchain_v1/langchain/agents/factory.py#L1855)。

## 故障、工具与取舍

框架接受应用传入的策略，工具可发现不等于权限已放行；生产授权要在 wrap/handler 或环境真正效果点执行。节点重试与 interrupt 恢复可能重跑程序片段，幂等由应用或更细的 durable 边界保证。checkpoint/save 与 shell/API 效果不在同一事务。完整语义见 [LangGraph 分册](../langgraph/architecture.md)，这里不拿框架类型名代替存储保证。

LCEL 适合明确的输入输出组合；create_agent 适合模型动态决定工具及继续次数；自定义 StateGraph 适合显式业务状态和分支。选择依据是控制流需求，未做性能排名。

## 六阶段原稿的归并

| 原稿内容 | 在本书的归属与保留价值 | 核验边界 |
|---|---|---|
| Stage 1 Runnable/LCEL | 本章通用协议；链式与并行组合 | 不把全部 Runnable 的 stream 都看作真正增量生成 |
| Stage 2 Messages/Model/Tool | 本章协议与执行边界 | 内容块、参数校验、injected 参数须读对应类型 |
| Stage 3 RAG | 独有应用模式：先检索再生成，或把检索做成模型工具 | retriever/vectorstore 是检索组件，不自动成为 agent loop |
| Stage 4 Graph/Agent | 独立 LangGraph 分册及本章 factory | 图节点不是必然一个 Agent |
| Stage 5 tracing | RunnableConfig callbacks 形成父子观测链 | trace span 成功不等于外部业务效果成功；未运行 LangSmith |
| Stage 6 partner/包边界 | core 定义协议，langchain 组装，partner 接 provider | 具体 provider 的 SDK/HTTP 路径需单独核验 |

教程练习和自检题留在 archive；本章提炼可维护的机制，不机械复制旧学习日程。Python 主干是本分册范围，不能推广成 TypeScript SDK 的实现。DeerFlow 锁定依赖与本基线分别登记，不能混为同一运行组合。

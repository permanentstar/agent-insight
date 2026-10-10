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

## 沿一项任务看 messages 怎样驱动图

![用户消息进入模型节点；AIMessage 的待执行 tool_calls 路由到工具；ToolMessage 按 call ID 回填，模型再决策；没有待续工作时走结束](../../assets/langchain-loop-flow.svg)

用“修复 CSV 导出”说明默认 Agent 图。调用者把用户要求交给 compiled graph，模型节点从 AgentState.messages 读取消息，构造当次 ModelRequest。system_message、工具定义和调用环境也在这一层绑定；运行进入模型终端 handler 后才调用 provider。

第一轮可以产生读取文件的 AIMessage。它的自然语言 content 解释动作，tool_calls 则承载程序可处理的调用。例如下面的节选表达一个调用，省略其他消息属性：

```python
AIMessage(
    content="先查看导出实现。",
    tool_calls=[{"name": "read_source", "args": {"path": "src/export.ts"},
                 "id": "read-1", "type": "tool_call"}],
)
```

`read_source` 是教学假设的应用工具。工厂不按 content 中的句子解析行动，而依据 tool_calls 及已经存在的 ToolMessage 判断哪些调用尚未执行。当前实现将待执行调用送给 tools；工具返回与 read-1 对应的 ToolMessage，消息 state 经 reducer 更新后，再由路由进入下一次模型节点。[模型节点构造请求](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/langchain_v1/langchain/agents/factory.py#L1579)、[待执行调用路由](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/langchain_v1/langchain/agents/factory.py#L2008)。

```python
ToolMessage(content="exportCsv 直接拼接字段，已有验证覆盖普通字段。",
            tool_call_id="read-1")
```

下一轮模型看到原目标、上一次动作和返回事实，可能选择修改，也可能再查测试。**模型决定做什么，图规定怎样承接和反馈这份决定。** 固定的是 model/tools 的协作骨架，工具种类和轮数随任务变化。

| 推进时点 | messages 的新增贡献 | 结构化控制 |
|---|---|---|
| 用户提交 | HumanMessage：目标、条件、资料引用 | 调用配置与 Runtime.context |
| 请求读取 | AIMessage：说明与 tool_calls | 工具名、args、call ID |
| 读取结束 | ToolMessage：代码观察 | tool_call_id 关联原请求 |
| 请求修改与验证 | 新的 AIMessage／ToolMessage | 继续按同一协议组织 |
| 正常回答 | 无待执行调用的 AIMessage | 路由到退出节点，受 middleware 等条件影响 |

这也是自然语言组织方式：框架不把所有正文变成一个固定 intent_class，而用消息角色、内容块和调用关联约束材料的解释。结构化输出又是另一种返回契约；它可以影响工厂结束条件，不能和“工具调用结果”混称。

## middleware 怎样改变同一条主线

before_model/after_model 作为图中的节点，可返回状态更新或允许的跳转；wrap_model_call 是模型调用的包裹，可以改当次请求或结果。比如只想为这次请求附上时间信息，可以 override request，而不必把时间永久追加为用户消息。

工具层同理。wrap_tool_call 可以在 handler 之前决定是否调用、怎样调用，或规范化结果。它是实际工具效果路径的一部分；而把某工具移出模型 schema，只影响这次请求的可见性。更完整的 hook 顺序见下表。

TodoListMiddleware 添加 write_todos 和 todos 状态，工具以 Command 更新清单并返回 ToolMessage。它让任务进度成为结构资料，下一步动作仍由模型与路由决定，不能将清单误读为自动逐项执行的调度器。[Todo 状态更新](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/langchain_v1/langchain/agents/middleware/todo.py#L140)。

## 用框架组织 Plan & Execute

如果应用要把规划和执行分开，可以定义 Planner 的结构化输出、Executor 接受的步骤，以及 Replanner 消费的完成结果。Planner 本身可以是一份模型调用；Executor 可以是一份 create_agent；外层再用 StateGraph 连接它们。这是框架的组合方式，不是 create_agent 默认主线自动拥有的三份模块。

在本案例中，外层计划可以保存“实现转义”这一项，而 Executor 内部独立读取、修改、测试多次。外层计划项与内层 tool call 是不同粒度。只有将输入输出契约和状态位置写清楚，组合后才不会出现两层都以为对方负责推进的情况。

学习自检：AIMessage.content、tool_calls 与 ToolMessage 各承担什么？如果同一图开始新请求，哪些对象复用、哪些 request 新建？为什么 Runnable 的统一调用接口不等于业务状态机？

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

## 组件之间怎样衔接

| 组件层次 | 连接关系 | 机制边界 |
|---|---|---|
| Runnable/LCEL | 本章通用协议；链式与并行组合 | 不把全部 Runnable 的 stream 都看作真正增量生成 |
| Messages/Model/Tool | 本章协议与执行边界 | 内容块、参数校验、injected 参数须读对应类型 |
| RAG | 独有应用模式：先检索再生成，或把检索做成模型工具 | retriever/vectorstore 是检索组件，不自动成为 agent loop |
| Graph/Agent | 独立 LangGraph 分册及本章 factory | 图节点不是必然一个 Agent |
| tracing | RunnableConfig callbacks 形成父子观测链 | trace span 成功不等于外部业务效果成功 |
| partner/包边界 | core 定义协议，langchain 组装，partner 接 provider | 具体 provider 的 SDK/HTTP 路径需单独核验 |

Runnable 提供统一调用接口，create_agent 生成控制图，LangGraph 推进节点；消息、工具和 provider 的契约则约束每个节点如何处理数据。按这条链理解组件，比按包名判断能力更准确。[学习路线](learning.md)给出逐层练习与自检问题。
<title>DeerFlow Agent 架构与运行机制：源码学习笔记</title>

<callout emoji="📌">
**适用范围**：本文基于 2026-08-26 当前 DeerFlow backend checkout 的源码，只整理已经从代码确认的机制。读者默认了解 Python、异步编程和 LLM function calling 的基础概念。
**阅读目标**：建立 DeerFlow 从 Gateway、run、agent graph、middleware、prompt/context，到 Skill、Tool、MCP 和 sandbox 安全机制的统一心智模型，并能继续沿源码定位。
</callout>

# 先建立整张图

```text
用户 / 前端 / IM Channel
        │ HTTP + SSE
        ▼
Gateway App（FastAPI / Starlette）
        │ 创建 thread/run，调度后台执行
        ▼
RunManager + worker.run_agent
        │ 为本次 run 组装运行上下文和 agent graph
        ▼
Agent 产品语义层  ───────┐
                        ├─ middleware / tools / prompt / state schema
Harness 通用运行时层 ───┘
        │ create_agent 构图
        ▼
LangChain Agent API
        │ 编译为 LangGraph graph
        ▼
LangGraph Pregel Runtime
        │ 按图调度 model、tool、middleware hook
        ▼
Model Provider / Sandbox / MCP / Store / Checkpointer
```

这张图需要把两个容易混淆的关系同时保留下来：

- **代码依赖方向**：App 依赖 Harness；Agent 代码使用 Harness 提供的通用能力；Harness 不反向 import App。
- **职责分工**：Agent 与 Harness 都位于 LangChain/LangGraph 之上。Agent 管产品语义，Harness 管可复用运行时能力；两者不是“上层控制下层执行器”的关系。
- **底层驱动**：graph 构造完成后，节点何时执行、如何循环、何时进入 ToolNode，由 LangGraph/Pregel 驱动。DeerFlow 主要通过 state schema、middleware hook、tools、checkpointer 和 stream mode 影响行为。

## 五个主要层次

| 层次 | 主要对象 | 职责 |
|-|-|-|
| Web 服务层 | Uvicorn、Starlette、FastAPI、Gateway routers | 接收 HTTP/WebSocket，请求校验、路由、SSE、应用生命周期。 |
| Run 调度层 | RunManager、RunStore、worker.run_agent、StreamBridge | run 状态机、并发准入、取消、流事件、checkpoint 和最终状态。 |
| Agent 产品层 | lead_agent/agent.py、prompt.py、ThreadState | 决定模型、产品 prompt、可用 Skill/Tool、产品边界处理和 agent 组合。 |
| Harness 通用层 | middleware、sandbox、memory、MCP、skills、subagents | 提供可插入 agent 的通用运行时能力。 |
| 图执行层 | LangChain create_agent、LangGraph/Pregel | 构图、执行 model/tool 节点、调用 middleware hook、checkpoint 和恢复。 |

# Web 入口与 run 主链路

## Starlette、FastAPI、Uvicorn 的关系

- **Uvicorn** 是 ASGI Server，负责监听端口并把请求交给 ASGI application。
- **Starlette** 提供 ASGI application、routing、middleware、lifespan、HTTP/WebSocket 等底层 Web 能力。
- **FastAPI** 建立在 Starlette 之上，增加类型驱动的参数解析、校验、依赖注入和 OpenAPI。
- **Gateway** 是 DeerFlow 的应用入口，在 FastAPI/Starlette 之上组合 REST routes、LangGraph-compatible run routes 和 SSE。

因此，Gateway 中看似“手工拼出的 dispatcher”属于应用路由和 run 协议适配；真正的 agent graph 执行不在 Starlette dispatcher 内。

## thread、run、agent instance 的边界

| 对象 | 生命周期 | 保存什么 |
|-|-|-|
| thread_id | 跨多轮用户交互的逻辑会话 | checkpoint 历史、消息状态、thread 级工作区等引用。 |
| run_id | 一次用户请求触发的一次 graph 执行 | queued/running/completed/error/interrupted 等状态、流事件、耗时和审计信息。 |
| agent instance | 当前实现中通常按 run 重新构造 | 模型包装、工具对象、middleware 列表、graph 结构；不是会话事实的权威存储。 |
| checkpoint/store | 独立于 Python agent instance | 可恢复的 graph state、消息、summary、业务状态。 |

一个 thread 可以连续产生多个 run。重新创建 agent instance 不等于创建新会话；新 instance 通过相同 thread_id 和 checkpointer 恢复状态。

## 从 start_run 到真正执行

```text
Gateway run route
  -> app.gateway.services.start_run
      -> 创建/校验 RunRecord
      -> RunManager 做 active-run 准入与后台任务调度
          -> worker.run_agent
              -> wait_for_prior_finalizing
              -> try_start：queued -> running
              -> publish(metadata: run_id, thread_id)
              -> agent_factory(...)：构造 agent graph
              -> 绑定 checkpointer / store / interrupt nodes
              -> agent.astream(...)
                  -> LangGraph/Pregel 真正执行 graph
                  -> StreamBridge 发布 messages/values/custom 等事件
              -> 持久化终态、事件和运行摘要
```

**真正进入 graph driver 的位置是 worker.py 中的 agent.astream。**此前的 RunRecord、try_start、metadata 事件都属于运行管理和传输准备，不是 agent 推理本身。

## metadata 事件

run 开始后发布的 metadata 事件只携带 run_id 和 thread_id，目的是让前端的 stream consumer 建立本次 run 与 thread 的关联。它通过 StreamBridge 发给订阅者，本身不代表新的业务状态落库，也不触发模型逻辑。

## interrupt nodes 与继续执行

interrupt_before / interrupt_after 是 LangGraph 的 graph breakpoint 配置：

- interrupt_before：节点执行前停下。
- interrupt_after：节点执行后停下。
- 停下时 graph state 已由 checkpointer 保存，不需要 Python agent instance 一直阻塞等待。
- 客户端提交 resume 命令后，Gateway 把输入转换为 Command(resume=...)；新的执行从 checkpoint 恢复。

典型用途包括人工确认、高风险动作审批、补充缺失信息、调试 graph 节点，以及外部系统异步返回结果。

# Agent、Harness、LangChain、LangGraph 的职责

## Agent 与 Harness 是职责并行、依赖单向

| 层 | 负责 | 不负责 |
|-|-|-|
| Agent | 产品人格、系统 prompt、模型选择、启用哪些 Skill/Tool、产品消息语义和边界 case。 | 不手工驱动 Pregel 节点逐步执行。 |
| Harness | middleware、sandbox、context compact、memory、MCP、stream bridge、subagent 等通用组件。 | 不替业务 agent 决定产品人格和任务目标。 |
| LangChain | 模型/Tool 抽象、AgentMiddleware 契约、create_agent 构图入口。 | 不负责 DeerFlow 的 run 数据库和前端 SSE 协议。 |
| LangGraph | graph state、reducers、checkpoint、interrupt、Pregel 调度和 astream。 | 不定义 DeerFlow 的 Skill、sandbox 和产品 prompt。 |

可以把 create_agent 理解为构图编译入口：LangChain 收集 model、tools、middleware 和 state schema，生成 LangGraph 可执行图；之后 Pregel runtime 按图执行。DeerFlow 不需要知道某个节点内部最终走 LCEL 还是 Pregel 的哪段内部实现，只依赖 graph 和 hook 契约。

# Middleware 的组合与执行

## Middleware list 同时表达能力集合与相对顺序

Agent 构建时先得到一个有序 middleware list，再交给 LangChain create_agent。框架根据每个 middleware 实现了哪些 hook，把它挂入相应阶段：

- before_agent / after_agent：一次 graph run 的前后。
- before_model / after_model：每次模型调用的前后。
- wrap_model_call：模型调用的 around wrapper。
- wrap_tool_call：Tool 调用的 around wrapper。

“选择挂靠”的主要依据就是对应 hook 是否实现。对于同一种 hook，middleware list 的相对顺序会影响 wrapper 嵌套和 state update 的先后。第一项通常是最外层 wrapper；进入 handler 时从外向内，返回时从内向外。

## 基础运行时 middleware 的三组

| 组 | 当前主要成员 | 目的 |
|-|-|-|
| outer_wrappers | InputSanitization、ToolOutputBudget、ToolResultSanitization | 包围模型调用；净化用户输入和外部 ToolResult，并限制进入模型的 Tool 输出体积。 |
| thread_hooks | ThreadData、Uploads（lead agent）、Sandbox | 在 run 开始时准备 thread 级路径、上传文件和 sandbox 状态。 |
| tail | DanglingToolCall、LLMErrorHandling、Authorization/Guardrail、SandboxAudit、ReadBeforeWrite、ToolProgress、ToolErrorHandling | 补历史消息、统一错误、安全审计、写前校验、进度和 Tool 结果规范化。 |

ToolOutputBudget 虽然主要在 handler 返回后处理 ToolResult，但它仍然是 around wrapper：调用时会“进入”该 wrapper，再调用内层 handler，最后截断返回结果。ToolResultSanitization 位于其内层，因此先净化原始结果，再由预算层截断。

## lead agent 追加的产品 middleware

| Middleware | 职责 |
|-|-|
| DynamicContextMiddleware | 把当前日期、记忆提醒等动态内容放进当前 turn 的隐藏上下文，保持基础 system prompt 尽量稳定。 |
| SkillActivationMiddleware | 识别真实用户消息开头的 /skill-name，校验 Skill 可用性，读取完整 SKILL.md 并注入当前 run。 |
| SkillToolPolicyMiddleware | 根据已激活 Skill 的 allowed-tools 过滤模型可见 Tool definitions，并在执行入口再次校验。 |
| DurableContextMiddleware | 在原始消息被 summarization 压缩前，提取已完成 delegation 和已加载 Skill；模型调用前重新注入 summary、delegation ledger 和 Skill 上下文。 |
| DeerFlowSummarizationMiddleware | 在上下文达到阈值时总结旧消息，保留最近消息并更新 summary_text。 |
| TodoMiddleware | plan mode 下扩展 system instructions，并提供 todo Tool。 |
| TitleMiddleware / MemoryMiddleware | 生成 thread 标题；把对话送入长期 memory 提取/写入流程。 |
| McpRouting / DeferredToolFilter | 自动 promote 匹配的 MCP Tool definition；隐藏尚未 promoted 的 definition，并阻断未 promotion 的直接调用。 |
| SystemMessageCoalescing | 在 provider 调用前把多个 SystemMessage 合并为一个 leading SystemMessage，兼容要求严格的模型后端。 |

## Middleware 返回 dict 的含义

before_model、after_model 等 hook 返回 None 表示“不修改 state”；返回 dict 表示“对 graph state 的部分更新”。dict 的 key 不是 middleware 通用固定全集，而由当前 agent 的 state schema 定义。

例如 messages、delegations、promoted、skill_context、summary_text 都是 ThreadState 中的 channel。每个 channel 是否允许、如何合并，由 schema 和 reducer 决定。delegations 和 promoted 是 DeerFlow 自定义 state key，不是所有 LangChain middleware 都可以通用理解的保留字。

# 消息流、run 边界与 durable context

## HumanMessage 是对话流中的 turn 边界

一次 run 通常由一条真实用户 HumanMessage 启动，随后可以产生多轮 AIMessage 和 ToolMessage。DeerFlow 会给真实用户消息补充 run_id 等 additional_kwargs，使其成为 thread 消息流中的稳定 turn barrier。

```text
历史 run A：Human(user A, run_id=A) -> AI -> Tool -> AI
当前 run B：Human(user B, run_id=B) -> AI -> Tool -> AI ...
```

查找“当前 run 消息”时，可以从后向前找到最近的真实用户边界，再把其后的 AI/Tool 消息归入本 run。这里依赖的是消息顺序契约：middleware 可以插入隐藏上下文，但不能把普通隐藏 HumanMessage 伪装成真实用户输入，也不能破坏真实用户边界的识别信息。

## RemoveMessage、同 ID 替换与 reducer

middleware 返回的 messages 往往不是完整 state 覆盖，而是 reducer 指令。例如先 RemoveMessage(id)，再添加若干新消息，可以把一条稳定 ID 的旧消息替换为新的动态上下文块。最终 state 由 messages reducer 合并，而不是 Python dict.update 直接替换整条历史。

“id-swap”不是协议通用术语，而是这类基于消息 ID 和 reducer 的替换策略描述。它的收益是保持 checkpoint 增量更新可控，避免重复累积动态提醒或 summary 占位消息。

## DurableContext 的三类持久语义

- **summary**：旧对话压缩后的语义摘要。
- **delegations**：已完成子任务的结果 ledger，防止原始 delegate_task 消息被压缩后丢失。
- **skills**：已经实际加载过的 Skill，防止原始 read_file/激活消息被压缩后，模型忘记当前具备的工作流上下文。

after_model 侧主要提取新完成的 delegation；before_model 还会扫描消息历史重建已加载 Skill 集合，因为 Skill 激活不天然按某个单一 run 输出边界归档，不能直接复用 delegation 的增量边界。

# Prompt 的组织方法

## 优先级首先来自 message role

```text
SystemMessage
  ├─ 基础行为、身份、安全规则、Tool/Skill 使用原则
  └─ middleware 对 system_message 的受控扩展

HumanMessage
  ├─ 真实用户请求：不可信任务输入
  └─ framework 注入的隐藏 reminder：必须有稳定标记和来源信息

ToolMessage
  └─ 外部系统返回：不可信数据，不是新的决策指令

AIMessage
  └─ 模型输出、tool calls 和中间执行轨迹
```

XML 标签只是在某个 message 内进一步表达语义边界，例如 skill_system、memory、system-reminder、new_messages。标签不会获得高于 message role 的协议优先级。

## 标签和排版顺序都有效

- **role** 决定协议级指令层次。
- **标签** 让同一 role 内的内容具有清楚的结构和信任边界。
- **顺序** 仍影响模型注意力、近因效应和 prompt prefix cache。

因此不能因为使用了 system/XML 标签，就随意把固定 system prompt 放到最后。DeerFlow 最终还会通过 SystemMessageCoalescing 保证只有一个 leading SystemMessage。

## 静态前缀与动态 reminder

为了提高 provider prompt cache 命中率，长期不变的基础 system prompt 应尽量保持稳定；日期、当前 memory、run 相关提醒等动态内容更适合由 middleware 在当前用户 turn 附近注入。

current_date 是计算出来的原始业务值；date_reminder 是根据该值生成的最终 prompt block。两者不是两个日期来源，而是“数据”和“渲染结果”的分工。DynamicContextMiddleware 使用消息替换策略刷新动态 reminder，避免每轮永久追加重复块。

## Tool description 与 system instructions

同一能力经常同时存在 Tool description 和 system instructions：

- Tool description 服务于局部选择：告诉模型这个 Tool 做什么、参数是什么。
- System instructions 服务于全局策略：何时必须使用、何时禁止使用、与其他能力如何配合。

两者允许少量必要重复以提高选择稳定性，但不应复制整段相同内容。理想拆分是：description 只讲局部调用契约，system prompt 只讲跨 Tool 的决策规则。

# Prompt 注入与硬安全边界

## 两条主要不可信内容入口

- **InputSanitizationMiddleware**：处理真实用户输入，防止其伪造 framework/XML 结构。
- **ToolResultSanitizationMiddleware**：处理 web/search 等外部 ToolResult，防止远端内容伪装成 system/skill 指令。

净化通常通过 escaping、替换危险标签结构和明确包裹不可信内容来破坏伪造边界，不等于删除所有可疑语句。ToolResult 仍然保留事实数据，只是被标记为外部返回，而不是模型必须遵守的新指令。

## Prompt guardrail 不能代替权限

system prompt 只能降低模型走错路径的概率，不能成为安全边界。如果某个敏感 Tool 对当前请求可达，并且授权条件无法在程序层判断，那么 prompt 失效时确实可能执行。因此安全控制必须尽量放在真正能够钳制动作的层：

1. 构建阶段过滤不应暴露的 Tool。
2. 模型请求阶段过滤 Tool definitions。
3. Tool invocation 阶段再次做 authorization/allowlist/confirmation。
4. 执行环境限制文件、网络、凭据和系统调用权限。
5. 审计并记录所有拒绝、降级和敏感执行。

长上下文中 system message 仍会重新注入，但模型并非形式化规则引擎，可能出现注意力衰减或冲突误判。上下文压缩的风险在于摘要可能错误描述历史授权、决策或事实；基础 system policy 本身不应依赖 summary 恢复。

# Context compaction、summary 与 memory

## 自动压缩

DeerFlowSummarizationMiddleware 挂在 before_model。每次模型调用前，它根据消息数/token 条件判断是否需要压缩：

```text
读取 state.messages + previous summary_text
  -> 判断是否超过触发阈值
  -> 切分 messages_to_summarize 与 preserved_messages
  -> summary model 生成新的 summary
  -> 触发 durable hooks
  -> reducer 删除被压缩消息并保留最近消息
  -> 更新 summary_text
```

自动路径生成 summary 失败时保持原 state，不提交空 summary。手动 /compact 走 runtime/context_compaction.py，复用同一 middleware 的 acompact_state(force=...)；手动路径会把“生成失败”和“不需要压缩”区分开。

## summary 与长期 memory 不是同一对象

| 对象 | 粒度 | 用途 |
|-|-|-|
| summary_text | thread/checkpoint | 压缩当前会话旧消息，控制模型上下文长度。 |
| durable memory | 通常按 user/agent 存储 | 跨 thread 保存用户偏好、长期事实和经验。 |
| delegation ledger | thread state | 保存已完成子任务结果，避免压缩后丢失。 |

代码不能推导出“同一用户永远只开一个 thread”的强约束。如果多个 thread 同时更新同一 user memory，正确性取决于 memory backend 的串行化、版本合并或幂等设计；不能把单进程 middleware 顺序当成跨 thread 的并发保证。

# Skill：指令包与工作流知识

## Skill 不是 Tool

```text
Skill Package：说明“应该怎么做”
├── SKILL.md frontmatter：声明与发现信息
├── SKILL.md body：完整工作流 instructions
├── references：补充资料
├── scripts：可执行辅助程序
└── templates/assets：资源

Skill 可以声明 allowed-tools
Skill 被激活后影响 Tool 可见性与使用策略
但 Skill 本身不是一个 function call
```

## 统一术语

| 术语 | 含义 |
|-|-|
| Skill manifest schema | SKILL.md frontmatter 允许哪些字段、字段类型和校验规则。 |
| Skill manifest | 某个 Skill 实际填写的 YAML frontmatter。 |
| Skill runtime metadata | 解析后保存在 Skill 对象中的 name、description、allowed_tools、路径、category、enabled 等。 |
| Skill routing metadata | 为了让模型发现/选择 Skill 而暴露的字段子集。 |
| Skill instructions | SKILL.md 正文；只有读取或 slash 激活后才进入模型上下文。 |
| Skill activation | 确认某个 Skill 已进入当前上下文，并开始应用其 instructions、allowed-tools 和 secrets policy。 |

## DeerFlow Skill manifest 字段

当前 validator 接受 name、description、license、allowed-tools、required-secrets、secrets-autonomous、metadata、compatibility、version、author。运行时 Skill dataclass 实际保留 name、description、license、allowed_tools、required_secrets、secrets_autonomous，并派生 skill_dir、skill_file、relative_path、category、enabled。

其中 metadata、compatibility、version、author 虽被 validator 接受，但当前没有进入 Skill dataclass，不参与现有运行时选择。DeerFlow 的 allowed-tools 要求 YAML list，这是其实现约定。

## 默认与 deferred discovery

| 模式 | 服务端已准备 | 模型初始可见 | 缺失内容何时补 |
|-|-|-|-|
| 默认，deferred_discovery=false | Skill 对象和 manifest metadata | name、description、category 标记、location | 模型选择后 read_file(SKILL.md)；引用资源继续按需读取。 |
| deferred discovery | 同样已构造 SkillCatalog 和 describe_skill Tool | 仅 Skill names | describe_skill 返回 description、allowed-tools、location；之后 read_file 正文。 |
| /slash 激活 | SkillActivationMiddleware 已构造 | 当前 Skill 正文被主动注入 | 主文件无需重复读取；支持资源仍按需读取。 |

默认模式不是“整个 Skill eager”。准确说法是：**manifest/routing metadata eager exposed，Skill instructions on-demand injected**。

parse_skill_file 为了解析 frontmatter，会暂时 read_text 整个 SKILL.md，但 Skill 对象不保存正文。因而从文件 IO 看正文被扫过，从 agent/model 语义看正文尚未加载，选中后仍需重新 read_file。

## Skill Activation 与 Tool Policy

- 用户显式输入 /skill-name：SkillActivationMiddleware 每个相关 run 都重新校验并注入，确保当前请求明确使用该 Skill。
- 模型自主选择：先通过 routing metadata 判断，再 read_file(SKILL.md)。成功读取会形成 skill context。
- SkillToolPolicyMiddleware：依据当前已激活 Skill 的 allowed-tools，过滤模型可见 definitions、tool_search 结果和实际执行。
- 已安装/已启用只意味着可发现，不代表 allowed-tools policy 已自动激活。

# Tool：可调用函数

## Runtime object 与 model-visible definition

```text
Tool runtime object（例如 LangChain BaseTool）
├── name
├── description
├── args_schema
├── func / coroutine
├── runtime metadata
└── callbacks / error handling / execution policy
        │ bind / serialize
        ▼
Model-visible Tool definition
├── name
├── description
└── parameters / input schema
```

| 术语 | 含义 |
|-|-|
| Tool registration | runtime object 已进入 ToolNode/执行器，服务端能按名称执行。 |
| Tool definition | 发给模型的完整调用声明，通常包含 name、description、parameters。 |
| Tool input schema | parameters 的 JSON Schema，用于约束 Tool arguments。 |
| Tool binding/exposure | Tool definition 被包含在当前 model request。 |
| Tool invocation | 模型生成 tool call，执行器调用 runtime handler。 |

口语中的“Tool schema”经常指整个 Tool definition；严格表达时，schema 只指 parameters/inputSchema。DeerFlow 的 deferred tool loading 延迟的是 model-visible Tool definition，不是 runtime object。

## tool_search 与 promoted

tool_search.enabled 默认是 false。开启后，当前 DeerFlow 只 defer MCP-sourced tools：

```text
Agent 构建
  ├── MCP BaseTool runtime objects 仍进入执行集合
  ├── 未 promoted 的 Tool definitions 不发给模型
  └── model 只知道 deferred tool names + tool_search

模型调用 tool_search(query)
  ├── 返回匹配 Tool 的完整 definitions
  └── state.promoted 写入 catalog_hash + names

下一次 model call
  └── DeferredToolFilter 暴露已 promoted definitions
```

promoted 是 DeerFlow/LangGraph state 中的状态机概念，不是模型 API 或 MCP 通用字段。它表达“该 Tool definition 已完成发现，可以对模型暴露并允许调用”。

# MCP：Tool 的发现与调用协议

MCP 不是 Skill 或 Tool 的同级替代物。它是 host 与外部 Server 之间发现、描述和调用能力的协议。

```text
MCP Server Config（DeerFlow operator 配置）
  -> MCP Client 连接 Server
      -> server/discover：Server identity / capabilities
      -> tools/list：枚举 MCP Tool definitions
          -> LangChain MCP adapter
              -> BaseTool runtime objects
                  -> DeerFlow 标记来源和 routing metadata
                      -> bind 为 provider-specific Tool definitions
```

## 三类容易混淆的 MCP 信息

| 对象 | 内容 |
|-|-|
| MCP Server configuration | transport、command/URL、env、headers、OAuth、timeout、operator routing hints；属于 host 配置。 |
| MCP Tool definition | tools/list 返回的 name、title、description、inputSchema，以及可选 outputSchema、annotations、\_meta 等。 |
| DeerFlow MCP routing metadata | deerflow_mcp 来源标记，以及 mode、priority、keywords；用于自动 promotion 和 tool_search，不是 MCP 标准 Tool schema。 |

## Skill search、Tool search、MCP discovery

| 能力 | 搜索对象 | 性质 |
|-|-|-|
| describe_skill | 已安装 Skill catalog | 模型侧语义/名称搜索；返回 Skill routing metadata。 |
| tool_search | 已配置并枚举的 MCP Tool definitions | 模型侧语义/名称搜索；返回 definition 并更新 promoted。 |
| MCP tools/list | 某个已连接 Server 暴露的 Tools | 协议枚举，不是模型语义搜索。 |
| MCP Registry | 可安装/配置的 MCP Servers | 部署与集成发现，不属于一次 agent run。 |

当前 DeerFlow 没有独立的模型 Tool 叫 mcp_search；MCP Tool 的模型侧搜索由 tool_search 承担。

# lazy、eager、deferred 必须带上目标对象

这三个词不是三个统一生命周期等级，不能直接说“Skill 是 lazy”或“MCP 是 deferred”。正确说法必须包含被延迟的对象：

| 推荐表达 | 实际含义 |
|-|-|
| Skill routing metadata eager-exposed | agent 构建时就把 name/description/location 放入 prompt。 |
| Skill routing metadata deferred | 初始只给 names，调用 describe_skill 后才暴露 description 等。 |
| Skill instructions on-demand injected | 选中 Skill 后读取 SKILL.md，正文才进入上下文。 |
| Tool definition deferred | runtime object 已注册，但 definition 尚未绑定给模型。 |
| Sandbox lazy-acquired | SandboxMiddleware 对象已经构造，仅把 sandbox acquisition 推迟到首次相关 Tool call。 |
| Thread directories lazy-created | ThreadDataMiddleware 已构造，只计算路径，目录等到需要时创建。 |
| Persistent MCP execution session lazy-acquired | tools/list 阶段已经可能建立临时连接来枚举 definitions；被 session pool 包装的持久执行 session 则可以在首次 Tool invocation 时建立或复用。必须指明是在说 discovery connection 还是 execution session。 |

middleware 的 \_\_init\_\_ 通常已经执行；lazy_init 延迟的是 middleware 所拥有的物理资源副作用，不是 middleware 对象本身。

# Sandbox、命令审计与文件并发

## SandboxAuditMiddleware

命令审计采用两步扫描，因为两步保留的信息不同：

1. **整体 raw command 扫描**：保留 shell 原始结构，能识别跨 token、跨子命令的危险组合，例如命令替换、下载后直接执行等。
2. **shlex/token 级递归扫描**：把复合命令拆成可解释的子命令，检查嵌套 shell、具体 executable 和参数组合。

第一步不能被第二步替代，因为分词会破坏某些依赖原始符号关系的 pattern；第二步也不能被第一步替代，因为整体字符串难以准确区分嵌套可执行单元。

wget 本身不是一律 high risk。类似 \$(wget -qO- URL) 命中的是危险 executable 出现在 command substitution 中：远端结果会被 shell 当作命令的一部分继续执行。管道写入、下载后执行和普通下载应分别按具体 pattern 判断。

## ReadBeforeWriteMiddleware

```text
read_file(path)
  -> 对实际返回给模型的文件内容计算 SHA-256
  -> ToolMessage.additional_kwargs.deerflow_read_mark = {path, hash}

write_file / str_replace(path)
  -> 写前重新读取当前文件
  -> 计算 Current Hash
  -> 查找历史最新 read mark
  -> 无 mark 或 hash 不一致：拒绝，要求重新读取
  -> 一致：允许进入实际写操作
```

它是 optimistic read-version gate：保证模型写入前看过当前版本。成功写入会改变 hash，因此下一次写通常需要重新读取。

## 锁的真实范围

- Gate lock key 是 scope + normalized path。
- scope 按 thread_id、sandbox_id、global 依次选择第一个可用值；这是 fallback，不是同时获取三层锁。
- 锁是当前 Python process 内的 threading.Lock，不是数据库锁或分布式锁。
- 它只能串行化同进程、同 scope、同规范化 path、且经过该 middleware 的受控写路径。

不同进程、不同 thread、共享挂载、bash 绕过、路径 alias、外部编辑器和远端文档系统都可能绕开这把锁。共享物理资源需要 provider 级 CAS，例如 resource_id + expected_revision 的原子 compare-and-write。

# Agent instance 是否需要常驻

DeerFlow 每个 run 重建 agent graph，不代表它只能做一次性 workflow wrapper，也不妨碍长会话。需要区分：

| 连续性 | 真正依赖 |
|-|-|
| 对话连续性 | thread_id、checkpoint、message history、summary。 |
| 个人身份与偏好 | durable memory、用户配置、Skill/Tool 授权。 |
| 及时响应 | 在线 Gateway/worker、事件触发、队列和资源预热。 |
| 长任务连续执行 | 可恢复 checkpoint、任务 ownership、worker lease/调度；不一定要求同一个 Python 对象。 |
| 物理资源复用 | sandbox provider、MCP session pool、model client connection pool 等独立资源生命周期。 |

把会话事实放在 checkpoint/store，把昂贵资源放在 provider/pool，而让 agent graph 按 run 重建，可以减少进程 affinity，方便多租户隔离、横向扩容、崩溃恢复和配置刷新。代价是每个 run 要重新组装 Python 对象和 prompt/tool catalog；是否值得常驻应基于真实构建耗时和资源命中率测量，而不是仅凭对象重建数量判断。

个人助理也不天然要求 agent instance 常驻。它要求的是身份、记忆、权限、事件监听和任务状态持续存在。只有确实依赖进程内不可序列化状态、专用低延迟缓存或独占环境时，才需要进一步设计常驻 agent/container；这与 model 是否多用户共享是两个独立部署决策。

# 后续源码定位索引

| 文件 | 定位内容 |
|-|-|
| app/gateway/app.py | FastAPI application、lifespan、router 组合。 |
| app/gateway/services.py | start_run、resume Command、run 参数组装。 |
| deerflow/runtime/runs/worker.py | run_agent、try_start、metadata event、agent.astream、interrupt 和终态。 |
| deerflow/agents/lead_agent/agent.py | make_lead_agent、工具和 middleware 组合、create_agent 入口。 |
| deerflow/agents/lead_agent/prompt.py | 基础 system prompt、Skill 列表和动态 prompt section。 |
| deerflow/agents/thread_state.py | ThreadState channels 和 reducers。 |
| deerflow/agents/middlewares/ | dynamic/durable context、summarization、Skill policy、安全和 Tool 生命周期。 |
| deerflow/runtime/context_compaction.py | 手动 compact 入口和 checkpoint 更新。 |
| deerflow/skills/ | Skill manifest、parser、catalog、describe_skill、storage。 |
| deerflow/tools/builtins/tool_search.py | deferred MCP Tool catalog、tool_search 和 promoted state。 |
| deerflow/mcp/ | MCP Server config、Tool discovery、adapter 和 session pool。 |
| deerflow/sandbox/ | Sandbox lifecycle、Tool 实现和物理文件操作。 |

# 最终术语速查

<callout emoji="✅">
**Skill**：manifest 已解析；routing metadata 已暴露；instructions 已注入；supporting resource 已读取。
**Tool**：runtime object 已注册；Tool definition 已绑定；input schema 已暴露；Tool 已调用。
**MCP**：Server 已配置；transport 已连接；Tool definitions 已枚举；MCP Tool 已适配为 BaseTool。
**运行时**：agent graph 已构造；run 已进入 running；checkpoint 已恢复；sandbox 已获取。
</callout>

避免单独说“已加载”“已注册”“schema 已就绪”“metadata 已准备”或“它是 eager/lazy/deferred”。这些表达必须同时指出对象、载体和阶段。
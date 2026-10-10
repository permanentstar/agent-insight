<title>DeerFlow Lead Agent Middleware 执行链：顺序、Hook、作用域与跨层影响</title>

<callout emoji="💡">
**结论：**`build_middlewares()` 是 Lead Agent middleware 的最终组装入口（composition root），本文列出的 #1～#36 是**有序槽位**，不是任何配置下都恰好有 36 个实例。前 14 个槽位由共享 runtime builder 组装，MCP routing 实例由上游预构建后传入，Custom 是调用方直接传入的实例，Extension 则在本函数中按配置反射实例化。最终由 LangChain `create_agent()` 按“是否实现对应 hook”把实际存在的实例编译进 LangGraph。
</callout>

本文面向 DeerFlow agent 框架维护者和源码学习者。目标是让读者仅凭本文，就能回答五个问题：某个 middleware 何时进入链；默认是否生效；每个 hook 在一次 run 的哪个位置执行；实例状态能否跨 user 复用；它写出的状态、标记或事件最终由谁消费。

**源码快照：**`0d8e11ad492bfa1a15b4409cc744ee66d6d188c0`；核对日期：2026-08-27。核心入口为 `build_middlewares()`（`packages/harness/deerflow/agents/lead_agent/agent.py:273-478`）。本文只描述该快照的 Lead Agent 链；Subagent 使用另一套共享 builder，不在总表范围内。

# 阅读口径

## 作用域术语

| 术语 | 本文含义 |
|-|-|
| user | 租户/用户身份，由 runtime `user_id` 标识；比 thread、run 更粗。 |
| thread | 持久会话，由 `thread_id` 标识；消息、checkpoint、thread workspace 等跨多次 run 延续。 |
| run / invocation | 一次用户请求触发的一次 graph invocation，由 `run_id` 标识。Gateway 主路径中二者一一对应；同一 run 可含多次 model↔tool 循环。 |
| model round | 一次 BM→WM/model→AM；若有 tool_calls 或 middleware `jump_to=model`，同一 run 会再进入下一 round。 |
| tool call | 一个 AIMessage 中的一次工具调用，由 `tool_call_id` 标识；并行工具调用共享 thread/run，但 ID 不同。 |
| ID-swap triplet | DynamicContext 用消息 reducer 的“同 ID 替换”语义，把一条真实用户消息展开成日期 SystemMessage、可选 memory HumanMessage、真实用户 HumanMessage 三个稳定位置。 |
| owner token | SkillActivation 与 SkillToolPolicy 在同一 middleware 链内共享的随机令牌，用来证明 slash skill 来源由前者写入，不是 caller 伪造；它不是业务 secret。 |
| OAP / passport | Open Agent Passport：声明 agent 身份、能力与运行限制的策略标准；`passport` 是交给 OAP provider 的 JSON 路径或 hosted agent ID。 |

## “默认开启”的判定

本文的“标准默认”同时采用两组输入：仓库 `config.example.yaml` 的产品示例值，以及请求没有显式传入运行模式开关时的默认值。需要特别注意：

- `summarization.enabled` 的 Pydantic 裸默认是 `false`，但标准产品示例配置是 `true`；本文按产品示例标为默认开启，并在表中保留这个差异。
- `is_plan_mode` 和 `subagent_enabled` 是 run 级请求选项；请求不传时均为 `false`。
- “默认构建”不等于“默认有动作”。例如 `TitleMiddleware` 总会构建，但配置关闭时内部 no-op；middleware 模式下 `MemoryMiddleware` 也总会构建，`memory.enabled=false` 时内部跳过。
- “条件开启”表示能力条件成立才进入链，例如 vision model、MCP deferred catalog、plan mode 或 subagent mode。

## Hook 缩写与顺序规则

| 缩写 | LangChain hook | 执行规则 |
|-|-|-|
| BA | `before_agent` | 一次 graph invocation 只执行一次；按注册列表正序。 |
| BM | `before_model` | 每次进入 model 节点前执行；按注册列表正序。 |
| WM | `wrap_model_call` | 第一个实例是最外层。进入 handler 时正序；模型返回或异常回退时反序出栈。 |
| AM | `after_model` | 每次模型返回后执行；按注册列表反序。后注册的 guard 会先改状态。 |
| WT | `wrap_tool_call` | 第一个实例是最外层。调用工具前正序进入；工具返回后反序出栈。 |
| AA | `after_agent` | 一次 graph invocation 收尾时执行；按注册列表反序。 |

LangChain 不是把每个 middleware 整体当成一个串行节点执行，而是先检查某个类是否覆盖了对应 hook，再分别生成 BA、BM、AM、AA 节点链和 WM、WT wrapper 栈。因此，“middleware 列表顺序”必须结合 hook 类型才能得到真实运行顺序。

# 一次 run 的执行图

<whiteboard token="X2bbwXZ45h7perbp9n8lWHlJgDb"></whiteboard>

方括号表示“该槽位可能不产生实例”，竖线后的文字给出标准示例状态或构建条件；它并不等于默认关闭。Custom 和 Extension 的具体 hook 无法在 composition root 预知；它们会在自己的类实现了相应方法时插入上述位置。若一个 run 含多个 model↔tool 往返，BM、WM、AM、WT 会重复，BA 只执行一次；AA 仅在路由进入 exit node 时执行。

| 结束/短路路径 | 是否经过 AA | 实际行为 |
|-|-|-|
| 模型自然结束 | 是 | AM 完成后进入 LangChain `exit_node`，按反序执行全部 AA，再到 END。 |
| `jump_to=model` | 暂不结束 | 回到 BM，开启同一 run 的下一 model round；最终自然结束时才执行 AA。 |
| Guardrail deny / ReadBeforeWrite block | 当前轮不结束 | inner WT/真实工具不执行，已进入的 outer WT 反序返回；ToolMessage 回到 model loop，后续自然结束时才执行 AA。 |
| Clarification `Command(goto=END)` | 绕过 | ToolNode 直接路由到 LangGraph END，不经过 composition graph 的 `exit_node`；不能依赖 AA 完成 memory、todo、sandbox 收尾。 |
| 未处理异常 / task 取消 | 不保证 | graph 没有正常进入 exit node；由 Gateway worker 的异常/finally 与应用生命周期负责外层状态和资源收尾。 |
| LangGraph interrupt | 不保证 | 执行暂停在 checkpoint/interrupt 节点，不应把 AA 当作必达事务提交点；恢复后是否进入 AA 取决于后续路由。 |

# 组装入口与实际实例数

`build_middlewares()` 负责最终 assembly，但实例来源分为四种。共享基础项由 `build_lead_runtime_middlewares()` 返回；`McpRoutingMiddleware` 由 `make_lead_agent()` 或 `DeerFlowClient._ensure_agent()` 先调用 `build_mcp_routing_middleware()` 构造，再作为参数插入；Custom 是调用方已经构造好的实例；Extension 由 `load_configured_extension_middlewares()` 在这里反射构造。下面的伪代码保留真实的 append/extend 条件，省略构造参数：

```text
middlewares = build_lead_runtime_middlewares(...)       # 槽位 1..14；共享 builder 组装
append DynamicContext / SkillActivation / SkillToolPolicy / DurableContext
if summarization.enabled: append Summarization
if request.is_plan_mode: append Todo
if token_usage.enabled: append TokenUsage
append Title                                             # disabled 时实例内部 no-op
append Memory，或在 tool mode 按 backend 能力决定是否保留
if resolved_model.supports_vision: append ViewImage
if upstream_mcp_routing_middleware is not None: append McpRouting
if deferred_setup.deferred_names: append DeferredToolFilter
append SystemMessageCoalescing
if request.subagent_enabled: append SubagentLimit
if loop_detection.enabled: append LoopDetection
if token_budget.enabled: append TokenBudget
extend caller_provided_custom_instances                  # 0..N
extend load_configured_extension_middlewares(...)        # 反射构造 0..N
append TerminalResponse / ModelLength
if safety_finish_reason.enabled: append Safety
append Clarification

# make_lead_agent()/DeerFlowClient 后续统一执行：
normalize_middleware_state_schemas(middlewares)
create_agent(..., middleware=middlewares)
```

**baseline 实例数：**以仓库产品示例配置为基础，并明确选择非视觉 model、`is_plan_mode=false`、`subagent_enabled=false`、无 deferred MCP、无 Guardrail、无 Custom/Extension 时，实际列表是 25 个实例：

<whiteboard token="SwSBwoWUhhlqN5bJANpl8VZNgLb"></whiteboard>

条件项会改变实例数：视觉 model +1；plan mode +1；subagent mode +1；deferred MCP 通常 +1～2；Custom/Extension 各可展开 0..N。所以下文 #33 只表示它位于“第 33 个槽位”，不保证运行时数组下标为 32。

## 默认状态的四个维度

“是否进入列表”和“进入后是否有动作”是两回事。下表是默认判定的权威口径；36 槽位总表中的颜色只是摘要。

| Middleware / 组 | 构建条件 | 代码裸默认 | 产品示例 | 构建后的动作条件 |
|-|-|-|-|-|
| 固定基础项 | Lead build 必建 | 存在 | 存在 | 多数每次对应 hook 都执行；具体 no-op 条件见 36 槽位表。 |
| ToolOutputBudget | 总构建 | enabled=true | enabled=true | disabled 时 wrapper 透传；开启后还需结果超过阈值。 |
| Authorization / Explicit Guardrail | 各自 enabled 且 provider 可用 | false / false | false / 示例注释 | 只处理 WT；当前两项同时构建会有 name 冲突，见风险节。 |
| ReadBeforeWrite | enabled=true 才构建 | true | true | 只对受管写工具且目标为已存在文件执行版本门禁。 |
| ToolProgress | enabled=true 才构建 | false | false/未配置 | 只跟踪非 exempt tools；启发式结果达到阈值才 warn/block。 |
| Summarization | enabled=true 才构建 | false | true | BM 达到 trigger 才真正调用 summary model。 |
| Todo | `is_plan_mode=true` | 请求 false | 请求 false | 计划尚未完成且模型准备结束时，最多两次回到 model。 |
| TokenUsage | enabled=true 才构建 | true | true | AIMessage 含 usage 或有 subagent usage 时才产生增量。 |
| Title | 总构建 | enabled=true | true | disabled/已有 title/尚无完整首轮时 no-op。 |
| Memory | middleware mode 总构建；tool mode 通常省略，需 passive writes 的 backend 例外 | enabled=true、mode=middleware | 同代码默认 | enabled=false 时 wrapper no-op；AA 未必达，后台提取也不是当前 graph 事务。 |
| ViewImage | resolved model supports_vision | 由 model 能力决定 | 由所选 model 决定 | thread state 有待注入的 viewed_images 时才读文件。 |
| MCP routing / DeferredFilter | tool_search enabled、有 deferred MCP；routing 还需 prefer metadata | false | false | promotion/catalog 状态决定某个 schema 是否可见/可执行。 |
| SubagentLimit | `subagent_enabled=true` | 请求 false | 请求 false | 本轮 AIMessage 含 task calls 时才裁剪。 |
| LoopDetection | enabled=true 才构建 | true | true | 重复/频率达到阈值才 warn/stop。 |
| TokenBudget | enabled=true 才构建 | false | false | usage 达 warn/hard threshold 才提示或收尾。 |
| Custom / Extension | 调用方传入 / 配置非空 | 空 | 空 | 由实现的 hook 决定。 |
| Safety | enabled=true 才构建 | true | true | provider detector 命中 safety/refusal 才改 AIMessage。 |

# 完整有序槽位总表

下表按 `build_middlewares()` 的组装先后排列。两种 Guardrail 分成两个槽位；Custom 和配置 Extension 各代表 0..N 个实例。

| 槽位 | Middleware | 标准状态 | Hook | 功能与适用场景 | 顺序依赖 | 实例与资源作用域 | 当前 run / 跨层影响 |
|-|-|-|-|-|-|-|-|
| 1 | **InputSanitizationMiddleware** | 默认开启 | WM | 只找最近一条真实用户 HumanMessage；中和伪造的框架/XML 权限标签，并包上用户输入边界。适合所有不可信用户输入。 | 模型 wrapper 最外层，使后续 inner wrapper 看到已隔离的用户内容；会识别 Uploads 保存的原始用户文本，避免清洗服务端注入块。 | 无可变实例状态，可跨 user 并发复用。 | 只改本次 ModelRequest，不写 checkpoint；异常时 fail-open。 |
| 2 | **ToolOutputBudgetMiddleware** | 默认构建且配置开启 | WM、WT | WT 对超大工具结果外置到 thread outputs，并返回摘要/文件引用；外置失败时 head+tail 截断。WM 再修补历史中遗留的大 ToolMessage。 | 必须在 ToolResultSanitization 外层：工具返回时先消毒，再做预算；依赖 ThreadData/Sandbox 提供输出路径或文件能力。 | 配置只读；实例可跨 user。物理文件由 user+thread 路径隔离。 | 会产生 `.tool-results` 文件；模型只能看到摘要，需用 read_file 取全文。 |
| 3 | **ToolResultSanitizationMiddleware** | 默认开启 | WT | 中和内置 `web_fetch/web_search/image_search/web_capture` 返回内容中的框架标签，防止把网页文本当成高权限指令。 | 位于 ToolOutputBudget 内层，所以返回阶段先消毒、后截断。 | 无可变状态，可跨 user。 | 只重写 ToolMessage/Command 结果；不覆盖任意命名的 MCP remote tool，这是明确边界。 |
| 4 | **ThreadDataMiddleware** | 默认开启；lazy | BA | 解析 user+thread 的 workspace/uploads/outputs 路径；lazy 模式只算路径，不提前建目录；给当前用户 HumanMessage 补 run_id 等边界元数据。 | 必须先于 Uploads 和 Sandbox，后两者需要 thread 标识与路径。 | 实例无请求状态；路径资源为 user+thread。 | 写入 `thread_data` 和消息元数据，成为文件工具、上传、输出外置的路径来源。 |
| 5 | **UploadsMiddleware** | Lead 默认开启 | BA | 只读取当前用户消息声明且磁盘存在的上传文件；选择上下文文件、提取 outline，并把 `<current_uploads>` 前置到用户消息。 | 依赖 ThreadData；必须早于 DynamicContext 的 ID-swap，也为 InputSanitization 保存 `original_user_content`。 | 实例无请求状态；文件访问为 user+thread。 | 写 `uploaded_files` 和当前 HumanMessage；异步路径把文件 IO offload 到线程池。 |
| 6 | **SandboxMiddleware** | 默认开启；lazy | BA、WT、AA | BA 在 eager 模式预取 sandbox，默认 lazy 时 no-op；WT 把工具内部首次获取到的 sandbox_id 转为 Command 状态更新；AA 释放本 run 的 provider 引用。 | ThreadData 之后；WT 的状态持久化使 ToolOutputBudget、task 等后续消费者能看到 sandbox。 | middleware 本身无可变请求状态；真实所有权由 SandboxProvider 以 user+thread 管理。 | `sandbox` 写入 graph state；release 不等于销毁，provider 可保持 thread warm sandbox，应用 shutdown 才最终清理。 |
| 7 | **DanglingToolCallMiddleware** | Lead 默认开启 | WM | 在送模型前修复历史中的缺失 ToolMessage、异常 tool name、配对顺序和孤儿 ToolMessage，兼容被截断/异常写入的历史。 | 位于 LLMErrorHandling 外层；其请求修复异常不由 LLMErrorHandling 捕获。 | 无可变状态，可跨 user。 | 只改 ModelRequest，不回写 checkpoint，修复的是 provider 协议视图。 |
| 8 | **LLMErrorHandlingMiddleware** | 默认开启 | WM | 分类 provider 异常，做有限重试、jitter backoff、circuit breaker、可选进程级 LLM 并发上限，并在失败后生成可见 fallback AIMessage。 | 包住所有后续 WM，因此也会捕获 inner middleware 抛出的异常；但捕获不到 1、2、7 在调用 handler 前抛出的异常。 | 并发 limiter 是进程全局；circuit 是实例内、无 user key 但有 lock。Gateway 每 run 新实例使 circuit 实际为 run 级；复用 graph 时 circuit 会跨 user 共享。 | 重试通过 custom stream event 告知前端；fallback 带 `deerflow_error_fallback`，worker 最终把 run 标成 error。 |
| 9 | **GuardrailMiddleware（authorization adapter）** | 默认关闭；当前不可与 #10 同开 | WT | 把当前 principal、thread/run、tool+args 交给 AuthorizationProvider；deny 时不执行工具。适合 RBAC/资源级授权。 | 在显式 Guardrail 外层，先拒绝可避免无意义的第二次策略调用。 | middleware 无本地请求状态；能否跨 user 取决于 provider。Gateway provider/graph 按 run 构建。 | deny 返回 error ToolMessage；决策 best-effort 写 RunJournal。默认关闭因为没有通用身份策略和 provider 可安全套用。 |
| 10 | **GuardrailMiddleware（显式 provider）** | 默认关闭；当前不可与 #9 同开 | WT | 执行工具前调用自定义 guardrail provider，可实现 allowlist、OAP 或组织策略；provider 异常按 fail-closed/open 配置处理。 | 位于 authorization guard 内层、SandboxAudit 外层。 | provider 每条链实例化；线程安全与多租隔离由 provider 契约决定。 | deny 返回 ToolMessage 并写 RunJournal。默认关闭因为必须由部署方提供策略、凭据和可用性选择。 |
| 11 | **SandboxAuditMiddleware** | 默认开启 | WT | 只审计 `bash`：输入合法性检查，regex+shlex 风险分类；high-risk 阻断，medium-risk 执行后把警告附到结果。 | 在两类外部策略之后；被 Guardrail 提前拒绝的 bash 不会进入 SandboxAudit，但已有 Guardrail journal。 | 无可变状态，可跨 user。 | 所有实际到达它的 bash 都写结构化 gateway log；这是启发式命令审计，不是 sandbox 物理权限边界。 |
| 12 | **ReadBeforeWriteMiddleware** | 默认开启 | WT | read_file 后把当前内容 SHA-256 标在 ToolMessage；修改已存在文件前重新读当前内容并比较 mark，要求每次修改前都看过当前版本。 | 必须在 ToolProgress 与 ToolErrorHandling 外层：自己阻断时不消耗 progress slot，并自行补标准 tool meta。 | mark 在 thread messages；锁为进程内模块全局，key 是 thread_id→sandbox_id→global 再加 path，不含 user，非分布式 CAS。 | 防住同一 lock scope 内“检查+写”竞态；不同 thread 修改同一物理文件不互斥。无法读取时 fail-open，让工具自身报错。 |
| 13 | **ToolProgressMiddleware** | 默认关闭 | BA、WT、WM | 按 thread+tool 追踪连续 error、partial success 和近重复结果，状态从 active→warned→blocked；WM 在下一次模型调用追加策略提示。 | 必须在 ToolErrorHandling 外层，才能在返回阶段读取 inner 写好的 `deerflow_tool_meta`；ReadBeforeWrite 又必须在它外层。 | 实例内 LRU，phase 以 thread_id+tool 为 key，pending 以 thread_id+run_id 为 key，有 lock；同一 user 可多 thread。跨 user 依赖 thread_id 全局唯一。 | BA 每 run 重置 phase；默认关闭因为这是结果质量启发式，可能误判并直接 block，且依赖工具结果元数据质量。 |
| 14 | **ToolErrorHandlingMiddleware** | 默认开启 | WT | 捕获工具异常但放行 GraphBubbleUp；把异常转成标准 error ToolMessage；规范化全部结果；成功读取 SKILL.md 时补 skill context metadata；task 异常补子任务状态。 | 在 ToolProgress 内层；又在 SkillToolPolicy、DeferredFilter、Clarification 外层，因此也能捕获这些 inner wrapper 的普通异常。 | 配置只读，无实例请求状态，可跨 user。 | 异常不再让 graph 崩溃，模型可继续选替代路径；skill metadata 是 DurableContext 后续识别已加载 skill 的生产者。 |
| 15 | **DynamicContextMiddleware** | 默认开启 | BA | 首轮用 ID-swap 把固定日期 SystemMessage、可选用户 memory HumanMessage 和原用户消息拆成稳定 triplet；跨午夜时给当前 turn 写日期更新。 | 在 Uploads 之后，确保上传上下文已拼入原用户消息；Summarization 会专门保留 triplet；SystemMessageCoalescing 最终整理 system 顺序。 | 实例只固定 agent_name/app_config；memory 通过 runtime user_id 读取，可跨 user，但必须保证 runtime identity 正确。 | 改动会持久化到 thread checkpoint；memory 内容保持 Human role。有效 memory hash 会写 RunJournal。 |
| 16 | **SkillActivationMiddleware** | 默认开启 | WM | 从最近真实用户消息识别 `/skill-name`，校验安装/启用/agent allowlist，读取完整 SKILL.md，注入隐藏 activation HumanMessage；同时计算本 run 所需 secret binding。 | 先于 SkillToolPolicy，并与其共享不可伪造的 owner token；显式 slash policy 在本 run 内优先于被动 skill context。 | **单 user 绑定实例：**构造时捕获 user_id；可服务该 user 的多 thread/run，不能复用给另一 user。 | activation 只存在本次 ModelRequest；run context 记录“该 slash 已激活”避免同 run 工具循环反复读盘；secret 只来自请求 context，不读宿主环境。 |
| 17 | **SkillToolPolicyMiddleware** | 默认开启 | WM、WT | active skill 出现后，WM 只向模型暴露 allowed-tools；WT 再做执行时门禁，并过滤 tool_search 返回的 schema 与 promoted names。 | 必须在 SkillActivation 后；其执行门禁在 DeferredFilter 之前，先收紧 skill 权限，再判断 MCP schema 是否 promoted。 | **单 user 绑定实例：**捕获 user_id；决策 token/允许集放 run context。 | 没有 active skill 时不限制；注册 skill metadata 不等于激活权限。解析失败时只保留 framework-safe tools，fail-closed。 |
| 18 | **DurableContextMiddleware** | 默认开启 | BM、AM、WM | BM 从历史提取 delegations 和已加载 skill；AM 只捕获当前 run 新/变更 delegation；WM 把 summary、delegation ledger、skill context 作为临时 system authority contract + 隐藏 Human data 注入。 | 必须先于 Summarization：先把即将被压缩的结构化事实写进 reducer-backed state；AM 反序执行使它在各类后置 guard 完成后再捕获最终 tool_calls。 | 实例无可变运行状态；数据归 thread checkpoint，可跨 user 复用。 | 写 `delegations`/`skill_context`；注入块只改 ModelRequest。它是 summarization 后恢复产品语义上下文的桥。 |
| 19 | **DeerFlowSummarizationMiddleware** | 产品示例默认开启 | BM | 达到 tokens/messages/fraction 阈值时，对旧消息生成滚动 summary，保留活跃尾部和 DynamicContext triplet；失败则自动路径 no-op，后续 turn 再试。 | DurableContext 之后；压缩成功后、删除旧消息前触发 before_summarization hooks，例如把将被压缩的消息交给 durable memory。 | 模型缓存是实例级、无 user 数据；模型对象需支持并发。Gateway 每 run 新实例；复用实例时只可能重复构建模型，不应混合 thread state。 | 返回 `RemoveMessage(ALL)+preserved` 并写 `summary_text`；summary model 调用带 nostream，不冒充聊天 AIMessage。Pydantic 裸默认为关闭。 |
| 20 | **TodoMiddleware** | 仅 plan mode | BA、BM、WM、AM、AA | 继承 LangChain TodoList；BM 在 write_todos 历史被压缩后重注 todo；AM 检测仍有未完成 todo 却准备结束的响应，最多两次 jump_to=model；WM 注入临时提醒。 | Durable/Summarization 后；必须早于 Clarification。AM 为反序执行，晚于 TokenUsage、Title 等后置项。 | 实例 bookkeeping 以 thread_id+run_id 为 key、有 lock；todo 正文在 thread state。ID 全局唯一时可跨 user 并发。 | 可改变 graph 路由并增加模型调用；默认请求不开 plan mode，避免简单问答承担 todo prompt、tool 和继续执行成本。 |
| 21 | **TokenUsageMiddleware** | 默认开启 | AM | 记录 provider usage，给 AI step 写 attribution；把 task tool 缓存的 subagent usage 回填到发起 delegation 的 AIMessage。 | AM 反序中先于 Todo、Durable；TokenBudget 注册更晚，因此预算 guard 会先累计并裁决，再到这里补 attribution。 | middleware 本身无状态；subagent usage 外部缓存按 tool_call_id。 | 写 AIMessage usage/attribution 并记录日志；它本身不主动上报 LangSmith，Gateway 的 RunJournal/callback 另行汇总与落库。 |
| 22 | **TitleMiddleware** | 总构建；配置默认开启 | AM | 仅首个完整 user↔assistant exchange 且 title 为空时生成。默认无 title model，直接截断首条真实用户消息；配置 model 时异步额外调用一次模型并本地 fallback。 | 在 Memory 之前注册；AM 反序时先于 TokenUsage/Todo/Durable。 | 无可变请求状态，title 属于 thread state，可跨 user。 | 写 `title`；配置关闭则 no-op。被取消的首轮还有 worker 独立 fallback 路径，不完全依赖本 hook。 |
| 23 | **MemoryMiddleware** | 默认 middleware 模式开启 | AA | graph 正常收尾后把 thread 消息、agent_name、user_id、trace_id 交给 MemoryManager；manager 负责筛选用户/最终 AI、debounce、LLM 提取和持久化。 | AA 反序中在 Todo 清理和 Sandbox release 之前。读取注入不是它做的，而是 DynamicContext。 | middleware 无队列；进程级 MemoryManager 必须按 user+agent 分区。user_id 在 enqueue 时捕获，避免后台线程丢 ContextVar。 | 写操作跳出 graph，进入 manager/background queue；Gateway shutdown 会尝试 flush。tool mode 通常不挂它，只有声明仍需 passive writes 的 backend 例外。 |
| 24 | **ViewImageMiddleware** | 仅 vision model | BM、AM | view_image 及同一 AIMessage 的所有工具完成后，BM 从可信实际路径读取图片、转 data URL，插入隐藏 HumanMessage；AM 立即移除，避免 base64 留在 checkpoint。 | AM 反序发生在 Title/TokenUsage 前；BM 在 Summarization/Todo 后。 | 实例无状态；轻量 `viewed_images` 在 thread state，文件路径必须由 tool 端验证。 | 最多读取 20MiB 图片并在异步路径 offload；非 vision model 不构建，因为 provider 无法消费 image block。 |
| 25 | **McpRoutingMiddleware** | 默认不构建 | BM | 从最近真实用户文本按 MCP routing keywords/priority 匹配 top-k deferred tools，预写 `promoted`，减少必须先显式 tool_search 的场景。 | 必须位于 DeferredToolFilter 前；代码有 build-time assert。 | routing index 只读；promotion 为 thread graph state，可跨 user。 | 仅在 tool_search 已启用、存在 deferred MCP tool，且至少一个 tool 带 `routing.mode=prefer` 和 keywords 时构建。 |
| 26 | **DeferredToolFilterMiddleware** | 默认不构建 | WM、WT | WM 从 bind_tools 隐藏尚未 promoted 的 MCP schema；WT 再阻断模型猜名字绕过发现流程的调用。 | McpRouting 先写 promotion；SkillToolPolicy 先收紧 active skill 权限；本项再应用 deferred 状态。 | deferred set/catalog hash 为构造期只读；promotion 归 thread。 | 默认 `tool_search.enabled=false`，所以所有 MCP schema 仍 eager 可见。开启后才构建，并把 tool_search 加入工具集。 |
| 27 | **SystemMessageCoalescingMiddleware** | 默认开启 | WM | 把独立 `request.system_message` 与 messages 内全部 SystemMessage 合并成唯一 leading SystemMessage；动态日期只保留最新一个。 | 位于 DeerFlow 已知的 system 注入者之后；只改最终请求，不破坏 checkpoint 中供其他 middleware 扫描的 marker。 | 无可变状态，可跨 user。 | 兼容 vLLM/SGLang/Qwen/Anthropic 等严格 provider。它之后的 Custom/Extension 若再插 SystemMessage，会绕过这次合并并重新破坏不变量。 |
| 28 | **SubagentLimitMiddleware** | 仅 subagent mode | AM | 直接保留一个模型响应中前 N 个 task calls，并按当前 run delegation ledger 限制总数；超额 task calls 被删除，不排队、不等待 slot。 | AM 反序晚于 Loop/TokenBudget：前面的 hard stop 已清空 tool_calls 时它不再处理。 | 实例无可变计数；已有用量来自 thread state 中按 run_id 标记的 delegations。 | 总额耗尽写 `stop_reason=subagent_limit_capped`，worker 落到 run record；默认 subagent_enabled=false，简单模式不暴露 task 能力。 |
| 29 | **LoopDetectionMiddleware** | 默认开启 | BA、AM、WM、AA | AM 检测重复 tool-call set，以及同一 tool 类型在独立频率窗口内的高频调用；warn 延迟到 WM；hard stop 清空 tool_calls 并强制收尾。 | AM 反序在 SubagentLimit 前，因此重复 task 批次可先被 loop guard 截止；TokenBudget 更晚注册，故预算先裁决并可能让 Loop 看不到 tool_calls。 | 实例内 history 以 thread_id 为 key，warning 以 thread_id+run_id，stop reason 以 run_id；有 lock/LRU。跨 user 依赖 ID 全局唯一。 | 设计上 history 跨 run；但 Gateway 每 run 重建实例，实际只在当前 run 有效。复用 graph 的 DeerFlowClient 才能得到跨-run history。hard stop 写 `loop_capped`。 |
| 30 | **TokenBudgetMiddleware** | 默认关闭 | BA、AM、WM、AA | BA 把历史 usage 标为已见；AM 增量累计本 run input/output/total，warn 延迟到 WM；达到 hard threshold 时清空 tool_calls。 | AM 反序先于 Loop/SubagentLimit；因此同一步同时越界时 token cap 通常先取得控制权。 | 实例内状态严格按 run_id，有 lock 和 bounded dict；run_id 唯一时可跨 user。 | hard stop 写 `token_capped`，worker/子代理 executor 消费。默认关闭，因为预算阈值是部署成本策略，通用默认值不应静默截断业务任务。 |
| 31 | **custom_middlewares（0..N）** | 默认无 | 由实现决定 | DeerFlowClient/调用方直接传入实例，用于嵌入场景的自定义 hook。 | 位于 SystemMessageCoalescing、Loop、TokenBudget 之后，Terminal/Safety/Clarification 之前；同类 hook 保持传入列表顺序，AM/AA 反序。 | 未知；调用方必须自己声明 user/thread/run scope 和并发契约。 | 名称必须全链唯一；若在 WM 追加 SystemMessage，当前 coalescer 已经过了，需自行维护 provider 不变量。 |
| 32 | **配置 extension middlewares（0..N）** | 默认空列表 | 由实现决定 | 从 `extensions.middlewares` 的 `module.path:ClassName` 反射加载，要求零参数构造。 | 在 custom 之后、Terminal 之前；同样受后续 Safety-first 的 AM 反序约束。 | 未知；零参实例也不代表无状态或多租安全。 | 加载/构造失败会让 agent build 失败；默认空是因为框架不能替部署方猜扩展类与配置。 |
| 33 | **TerminalResponseMiddleware** | 默认开启 | BA、AM、WM、AA | 检测“当前真实用户 turn 已有 ToolMessage，但模型最终返回空文本且无 tool intent”。首次移除空 AIMessage、jump_to=model 并注入恢复提示；第二次写可见 fallback。 | Safety/ModelLength 后注册，所以 AM 反序中 Safety、ModelLength 先处理；避免安全截断被误当作空终局。 | 实例状态以 thread_id+run_id 为 key，有 lock/bounded dict；ID 唯一时支持跨 user。 | fallback 带 `deerflow_error_fallback`，worker 将 run 标 error；jump_to=model 会多一次模型调用，不新增 tool result。 |
| 34 | **ModelLengthFinishReasonMiddleware** | 默认开启 | AM | 只处理“有可见内容、无 tool intent”的 terminal AIMessage；provider detector 命中长度上限时保留内容不变。 | AM 反序位于 Safety 之后、Terminal 之前；仅当 context 尚无 stop_reason 才写。 | detector 列表只读，无 user 状态，可跨 user。 | hook 必定返回 None，但通过副作用写 `runtime.context.stop_reason=model_length_capped`；worker 最终落 run record。 |
| 35 | **SafetyFinishReasonMiddleware** | 默认开启 | AM | provider 标记 safety/refusal 且仍带 tool_calls 时清空不可信/可能截断的调用；若 safety 终止返回空消息，则回填可见解释，防止空 assistant 污染 thread。 | 刻意在 Terminal、Custom/Extension 之后注册，使 AM 反序时它最先运行，清理后的消息再交其他 accounting/terminal guards。 | detector 列表只读；可跨 user。 | 写 `safety_capped`、发 custom event、写 RunJournal。若后续 TokenBudget 同时 hard-stop，单一 stop_reason key 可能被覆盖。 |
| 36 | **ClarificationMiddleware** | 默认开启且最后 | WT | 只拦截 ask_clarification；规范化 options/form fields，生成兼容前端的 human_input artifact 与文本 fallback，返回 `Command(goto=END)`。非交互 run 则返回提示模型自行判断的 ToolMessage。 | 作为 WT 最内层，先经过外层授权、skill policy 和 deferred gate；它本身不执行原始 tool handler。 | 无可变状态，可跨 user；请求/消息仍为 run/thread scope。 | 结束当前 graph loop，前端按 artifact 展示交互卡；用户回答会形成后续新 run。这里明显耦合 DeerFlow 前端协议，不是纯通用 harness 行为。 |

# 按 hook 展开的真实动作

## before_agent：建立本 run 的线程与边界上下文

1. **ThreadData：**先解析 user+thread 文件路径，并给真实用户消息补 run 边界元数据。
2. **Uploads：**只处理当前消息的上传，保留原始用户文本。
3. **Sandbox：**默认 lazy no-op；eager 才获取 sandbox。
4. **ToolProgress（可选）：**清掉同 thread 其他 run 的 pending，并把所有工具 phase 重置为 active。
5. **DynamicContext：**首轮/跨午夜时执行持久 ID-swap。
6. **Todo（可选）：**清理同 thread 其他 run 的 completion reminder bookkeeping。
7. **LoopDetection：**只清 pending warning，不清 thread history；但 Gateway 新实例使 history 本来就是空。
8. **TokenBudget（可选）：**把 checkpoint 中历史 AI usage 标成已见，确保预算只计当前 run 增量。
9. **Custom/Extension：**按注册顺序执行各自 BA。
10. **TerminalResponse：**清理旧 run bookkeeping，并初始化当前 run 的一次恢复预算。

## before_model：每轮模型调用前先固化、再压缩、再补模型能力

1. **DurableContext：**把 message 历史中可识别的 delegation/skill 增量写入专用 state channel。
2. **Summarization（可选）：**达到阈值才生成 summary 并删除旧消息；因此 Durable 已先把结构化事实抢救出来。
3. **Todo（可选）：**若 todo state 还在、原 write_todos 消息已被压缩，追加持久的隐藏 reminder。
4. **ViewImage（可选）：**工具完成后把图片 base64 临时写入 state，供即将发生的模型调用消费。
5. **McpRouting（可选）：**根据最新用户文本更新 promoted，随后 WM 的 DeferredToolFilter 才会放出 schema。

## wrap_model_call：请求变换、短路与模型异常

WM 是 around 栈。进入阶段正序变换 ModelRequest；返回阶段反序处理结果。当前内置项以“请求前动作”为主，只有 LLMErrorHandling 会多次调用或跳过 handler，SkillActivation 也可能在 skill 不可用时直接短路为 AIMessage。

- **LLMErrorHandling 的 retry 是局部 retry：**它在槽位 #8。第一次进入时 #1 Input、#2 Budget、#7 Dangling 已经运行；每次 retry 只再次调用 #8 的 inner handler，因此会重跑 #13 ToolProgress（若启用）、#16 SkillActivation、#17 SkillToolPolicy、#18 Durable、#20 Todo（若启用）、#26 Deferred、#27 Coalescing、#29 Loop、#30 TokenBudget、Custom/Extension 和 #33 Terminal，不会重跑 #1/#2/#7。
- **SkillActivation 短路：**#16 若直接返回 ModelResponse，则 #17 之后的 inner WM 不执行；外层 #13/#8/#7/#2/#1 仍按返回方向出栈，随后 model node 仍进入 AM 链。
- **安全边界：**InputSanitization 隔离真实用户输入；ToolOutputBudget 修补历史大结果；DanglingToolCall 修 provider 配对；LLMErrorHandling 包住剩余 inner 栈。
- **动态产品上下文：**ToolProgress/SkillActivation/SkillToolPolicy/Durable/Todo 根据当前 run 与 thread state 注入隐藏 HumanMessage、筛选 tools 或写 secret binding。
- **工具可见性：**DeferredToolFilter 隐藏未 promoted MCP schema；SystemMessageCoalescing 合并 DeerFlow 已知的 SystemMessage。
- **收尾提醒：**Loop、TokenBudget、Terminal 从各自 pending queue 取出提示，追加在现有 ToolMessage 之后，避免破坏 assistant tool_calls→tool results 的协议配对。

## after_model：反序 guard 决定这一轮是否还能进 tools

AM 的反序不是形式细节：它先定义“谁先看到并改写 AIMessage”。但这不自动等于最终 `stop_reason` 的保留优先级；后者取决于各 middleware 是覆盖写还是仅空时写。固定内置链为：

<whiteboard token="Mma9wAbrVhorJTbJXeyl0BgXgog"></whiteboard>

- Safety 最先清理危险 tool_calls，后面的 guard 看到的是修复后的 AIMessage。
- TokenBudget hard stop 清空 tool_calls 后，Loop/SubagentLimit 通常不会再触发；因此同一步多重越界时预算优先。
- Loop hard stop 清空 tool_calls 后，SubagentLimit 不再裁 task；否则 SubagentLimit 直接删超额 task。
- DurableContext 最后捕获 delegation，记录的是前面所有 guard 修改后的最终调用集合。
- 当前所有 cap 共写一个 `runtime.context.stop_reason`。这不是 reducer；消息清理发生得早，不代表 reason 一定保留到最后。

| AM 写入者 | AM 相对顺序 | 写入规则 | 同轮命中时的结果 |
|-|-|-|-|
| Safety | 最先 | 命中即覆盖为 `safety_capped` | 先清不可信 tool_calls；若后续 TokenBudget 也到 hard threshold，reason 会被 `token_capped` 覆盖。 |
| ModelLength | Safety 之后 | 仅 context 尚无 key 时写 `model_length_capped` | 不会覆盖 Safety；但后续覆盖写者仍可覆盖它。 |
| Custom / Extension | Terminal 之后 | 未知 | 框架无法保证；扩展必须声明是否覆盖现有 reason。 |
| TokenBudget | Loop/Subagent 之前 | hard threshold 命中即覆盖为 `token_capped` | 同时清空 tool_calls，所以后面的 Loop/Subagent 通常不再命中；一般成为最终值。 |
| LoopDetection | TokenBudget 之后 | hard loop 命中即覆盖为 `loop_capped` | 只有前面尚未清空 tool_calls 才可能命中；命中后 SubagentLimit 通常不再处理。 |
| SubagentLimit | 上述 guard 之后 | 总额度耗尽时覆盖为 `subagent_limit_capped` | 只有仍存在 task calls 才处理；前面 hard stop 已清 calls 时不会覆盖。 |

因此当前代码的“通常优先级”来自**执行顺序 + 是否清空 tool_calls + 写入条件**三者共同作用，不是显式的 reason arbiter。worker 源码也已留下把单值改成 publish/collect 的提示。

## wrap_tool_call：执行前门禁与执行后规范化

WT 进入时的实质顺序是：预算 wrapper→远程结果消毒 wrapper→sandbox 状态 wrapper→授权→显式 guardrail→bash 审计→读前写→progress→异常规范化→skill policy→deferred gate→扩展→clarification→真实 tool。返回时完全反过来。

这解释了三个常被误读的点：

- **ToolOutputBudget 看起来排在 ToolResultSanitization 前面，但返回阶段反序：**原始结果先被 Sanitization 处理，再被 Budget 外置/截断。
- **ToolProgress 排在 ToolErrorHandling 前面：**进入时 progress 先放行，返回时 ToolErrorHandling 先补 meta，progress 才能读取。
- **Clarification 放最后：**它是最内层，不执行 ask_clarification 的工具函数；但 authorization、skill policy 等外层门禁仍有机会先拒绝这次调用。

## after_agent：先记录外部结果，再释放基础资源

当路由进入 LangChain `exit_node` 时，AA 固定反序为 Terminal→扩展→TokenBudget→Loop→Memory→Todo→Sandbox。Memory 在 sandbox release 之前把对话交给 manager，但它只传消息和身份，不依赖 sandbox；Sandbox 最后释放本次引用。Clarification 的 `Command(goto=END)`、未处理异常、取消和 interrupt 都不能把 AA 当作必达点；Terminal 的 BA 因此还会防御性清理遗留状态，进程级 manager/provider 则必须有应用生命周期收尾。

# 顺序依赖与当前实现风险

| 依赖 / 不变量 | 当前顺序如何保证 | 反转或扩展不当的后果 |
|-|-|-|
| ThreadData → Uploads → Sandbox | 先建立 thread/user 路径，再读上传与绑定 sandbox。 | 后者拿不到正确隔离路径或 thread_id。 |
| Uploads → InputSanitization | BA 先保存 original_user_content，WM 再只消毒用户原文。 | 服务端可信的 current_uploads 块可能被误当成用户注入，或用户原文边界失真。 |
| ToolResultSanitization → ToolOutputBudget（返回方向） | Budget 注册在外层，返回阶段后执行。 | 若先截断再消毒，截断片段可能保留完整注入结构或外置未净化原文。 |
| Authorization → Explicit Guardrail | authorization 是外层，deny 即短路。 | 无谓调用第二个外部策略 provider，增加延迟与失败面。 |
| ReadBeforeWrite → ToolProgress → ToolErrorHandling | 进入正序、返回反序；blocked write 自己补 meta。 | blocked write 误消耗 progress 计数，或 progress 看不到标准 meta。 |
| SkillActivation → SkillToolPolicy | 共享 owner token，先写可信 slash source，再计算 allowed-tools。 | policy 看不到本 run 显式激活，或可被 caller 伪造 context source。 |
| DurableContext → Summarization | BM 先 capture，后 compact。 | task/skill 原始消息被删后，结构化 ledger 无法恢复。 |
| McpRouting → DeferredToolFilter | BM 先写 promoted；WM 再按 catalog hash 过滤。 | 自动匹配成功仍看不到 schema。代码用 assert fail-fast。 |
| SystemMessageCoalescing 在已知 system 注入者之后 | DynamicContext 写 state，Durable 等 wrapper 先注入，coalescer 后整理。 | 严格 provider 拒绝非 leading/multiple system。Custom/Extension 当前位于 coalescer 内层，若新增 system 必须自负这个契约。 |
| Safety 最晚注册、最早 AM | LangChain AM 反序执行。 | 截断/不可信 tool_calls 可能先被其他 hook 计数、裁剪甚至路由执行。 |

**这些顺序并非都由框架自动保护：**

| 保护强度 | 当前依赖 | 维护含义 |
|-|-|-|
| build-time fail-fast | McpRouting → DeferredFilter；ToolProgress → ToolErrorHandling | 前者有显式顺序 assert；后者在 ToolProgress 启用时检查类型索引，反转会直接 build 失败。 |
| 共享令牌/构造约束 | SkillActivation → SkillToolPolicy | 同一 composition root 生成 owner token 并传给两者，可防伪造来源；但列表相对顺序仍需测试保护。 |
| 源码注释与测试约定 | ThreadData/Uploads、Budget/Sanitization、Durable/Summarization、Safety reverse-order | LangChain 只保留列表语义，不知道 DeerFlow 业务依赖；调整顺序必须跑针对请求、返回和 AM 反序的回归测试。 |
| 仅软约定 | SystemMessageCoalescing 之后的 Custom/Extension | 框架不会阻止扩展重新插入 SystemMessage；扩展作者必须自行维持 strict-provider 的单 leading system 契约。 |

<callout emoji="💡">
**当前实现风险：authorization 与显式 guardrails 不能安全同时开启。**builder 会构建两个 `GuardrailMiddleware` 实例，顺序语义也有单测；但该类没有覆盖 `name`，两个实例名称都等于类名。当前 LangChain `create_agent()` 在编图前要求 middleware name 全局唯一，因此两项同时开启会在 graph build 阶段触发 duplicate middleware 断言。Custom/Extension 之间同名也受同一约束。
</callout>

# 实例安全与多租作用域

讨论“跨 user 安全”必须同时看四层：middleware 实例字段、模块/进程全局对象、thread checkpoint/runtime context、外部 provider/物理资源。线程锁只能保证 Python 对象并发不被写坏，不能自动证明多租语义正确。36 槽位总表逐项给出了 scope；下面按状态 owner 再聚合一次，避免把“实例无状态”误读成“整条能力跨 user 安全”。

| 状态 owner | Middleware | 分区 key / 生命周期 | 可复用边界 |
|-|-|-|-|
| 构造后只读或无可变实例字段 | InputSanitization、ToolOutputBudget、ToolResultSanitization、ThreadData、Uploads、Sandbox wrapper、DanglingToolCall、SandboxAudit、ToolErrorHandling、DynamicContext、DurableContext、Title、Memory wrapper、ViewImage、McpRouting、DeferredToolFilter、SystemMessageCoalescing、SubagentLimit、ModelLength、Safety、Clarification | 实例本身无 request data；实际数据在 request/state/provider。 | Python 实例可以跨 user 并发；但仍要继续检查下列外部 owner，不能只看本行下结论。 |
| 构造时绑定 user | SkillActivation、SkillToolPolicy | 实例捕获 `user_id`；run context 保存 activation/policy decision。 | **只能同一 user 复用：**可跨该 user 的 thread/run，换 user 必须重建。 |
| 实例内可变字典/LRU | ToolProgress、Todo、LoopDetection、TokenBudget、TerminalResponse | thread_id、run_id 或二者组合；lock + bounded/LRU。 | ID 全局唯一时支持多 user 并发。缺 ID 时 fallback key 会合并无关调用，不能宣称多租安全。 |
| 实例内未按 user 分区 | LLMErrorHandling circuit breaker | 整个 middleware 实例一个 circuit；有 lock、无 user key。 | 复用 graph 时任一 user 的 provider 失败会影响其他 user；线程安全不等于租户隔离。 |
| 实例级 lazy model cache | DeerFlowSummarization | 缓存 summary model，不缓存 thread 消息；消息在 checkpoint。 | 是否可跨 user 取决于 model client 的并发契约与凭据是否共享；不能仅按 summary state 判断。 |
| 模块/进程全局 | ReadBeforeWrite；LLM limiter；TokenUsage 外部 subagent usage cache | RBW lock key=(thread_id 或 sandbox_id 或 global, path)，不含 user；limiter 故意全局；usage cache 按 tool_call_id。 | 要求 thread/run/tool_call ID 全局唯一。RBW 只是同进程局部 gate，不是跨进程锁、数据库锁或物理文件 CAS。 |
| thread checkpoint / runtime context | ThreadData、Uploads、Sandbox、Dynamic、Skill、Durable、Summary、Todo、Title、ViewImage、MCP promoted、SubagentLimit、各类 stop_reason | checkpoint 主要按 thread；临时 context/marker 主要按 run；消息内还有 tool_call_id。 | 依赖 checkpointer 与 Gateway identity 正确分区；middleware 锁不能修复错误的 thread/user 映射。 |
| 进程级 provider/manager | SandboxProvider、MemoryManager/backend、RunJournal、model clients | 应用 lifespan；内部再按 user+thread、user+agent 或 run 分区。 | Gateway 即使每 run 重建 graph，这些对象也不会随 run 重置；共享安全由 provider 契约、存储隔离和 shutdown flush 决定。 |
| 插件/provider 自己负责 | 两种 Guardrail、Custom、Extension | 未知；可能含缓存、连接池、凭据和外部 policy state。 | 必须由实现声明锁、身份分区、secret 生命周期、失败策略和清理路径。 |

## Gateway 与 DeerFlowClient 的实例生命周期不同

| 入口 | 当前生命周期 | 对作用域结论的影响 |
|-|-|-|
| Gateway worker | `run_agent()`（`worker.py:693-756`）在每个 run 内调用 agent factory；`make_lead_agent()` 重建 model、tools、middlewares 和 compiled graph。 | 大多数**实例字段**实际被压到 run 级。LoopDetection 的 history 不跨 Gateway run，LLM circuit 也几乎无法跨 run 累积；但进程 limiter、RBW 模块锁、MemoryManager、SandboxProvider、RunJournal 和底层连接池不会随 graph 重建。 |
| DeerFlowClient | `client.py:261-390` 按配置 key 缓存 compiled agent，key 变化才重建。 | Loop history、circuit、Todo/Terminal 等实例状态可以跨 run。更重要的是：authorization 关闭时 cache key 不包含 user_id，而 SkillActivation/SkillToolPolicy 构造时捕获 user_id；因此一个 DeerFlowClient 实例不应被当作跨 user 的共享 service。 |

<callout emoji="🔒">
**当前可执行的多租使用规则：**
1. **Gateway：**继续按每 run 构建 Lead graph；同时把 MemoryManager、SandboxProvider、model client、模块全局 lock/cache 当作进程级共享资源单独审计，不能因 graph 是 fresh 就宣称全链 run-isolated。
2. **DeerFlowClient：**当前按“一 user 一 client 实例”使用。若要把一个 client 共享给多个 user，graph cache key 至少必须包含 effective `user_id`，并保证 SkillActivation/SkillToolPolicy 随 user 重建；在代码完成这一点前不要跨 user 复用。
3. **Embedding/自定义入口：**必须提供非空且全局唯一的 `thread_id`、`run_id`、`tool_call_id`。无法保证时，应在入口拒绝多租并发或把实例明确限定为单 user 串行，不能依赖 `default/global` fallback key。
4. **共享物理文件：**user+thread workspace 正常隔离时使用 middleware gate；多个 thread/进程确实共享同一文件时，必须在 storage/provider 层加 version CAS、数据库锁或物理文件锁，RBW 不能替代。
</callout>

# 跳出 middleware 层的影响

下面按“生产者→载体→消费者→清理者”列出跨层协议。reducer/checkpoint 只是合并和持久化载体，不等同于业务消费者；方法调用也不叫“输出”。

| 生产者 | 载体 / 字段 | 消费者 | 清理 / 保留 | 当前 run 与产品表现 |
|-|-|-|-|-|
| ThreadData / Uploads | ThreadState `thread_data`、`uploaded_files`；HumanMessage `original_user_content` 与 run metadata | Sandbox、ToolOutputBudget、文件工具、DynamicContext、InputSanitization、list_uploaded_files | uploaded_files 在后续 BA 清空/替换；消息 metadata 随 checkpoint 保留到压缩/删除。 | 建立 user+thread 文件边界，并让消毒逻辑只处理用户原文，不误伤可信 uploads 块。 |
| SandboxMiddleware | ThreadState `sandbox`（sandbox_id）+ 进程级 SandboxProvider | 所有 sandbox tools、task、ToolOutputBudget | 正常 AA release 本 run 引用；provider 可保留 warm thread sandbox，应用 shutdown 最终清理。直接 END/异常不能依赖 AA。 | 首次工具调用后 sandbox_id 可进 checkpoint；release 不等于物理销毁。 |
| ReadBeforeWrite | read ToolMessage 内的 SHA read mark；模块全局 path lock | 同 thread/sandbox scope 的后续 write_file/str_replace | lock 每次 WT 返回即释放；read mark 随消息保留，summary/消息删除后消失。 | 实现乐观“先读当前版本再写”；不是跨进程 CAS，也不覆盖不同 thread 共享文件。 |
| ToolErrorHandling / RBW | ToolMessage `additional_kwargs.deerflow_tool_meta`；skill read 还带 skill context metadata | ToolProgress 分类；DurableContext 提取已加载 skill；subagent/task 状态处理 | 随 ToolMessage 持久化，后续可能被 summarization 压缩；Durable 已提前转存结构化 skill_context。 | 工具异常转成模型可消费结果，不直接让 graph 崩溃；后续 middleware 能按统一 meta 分类。 |
| SkillActivation / SkillToolPolicy | run context 的 slash source、policy decision、secret binding；临时 hidden HumanMessage | 同 run 后续 WM/WT、工具 schema 过滤与执行门禁；RunJournal `bind_secrets` 审计 | run context 随 invocation 结束；每次 model call 重新根据当前 request secrets 计算，避免旧 secret 继续绑定。 | 完整 SKILL.md 只在激活时对模型可见；secret 只从 caller request context 绑定。 |
| DurableContext | ThreadState `delegations`、`skill_context` 与临时 authority/data blocks | checkpoint reducer、后续 ModelRequest、Summarization 后的语义恢复 | 结构化 channel 跨 run 保留；临时注入只存在当前 ModelRequest。 | task/skill 原始消息即使被压缩，产品语义仍可恢复。 |
| Summarization | ThreadState `summary_text` + `RemoveMessage(ALL)` / preserved messages | messages reducer、DurableContext、后续 model round | 新 summary 滚动替代旧版本；被删消息从后续 checkpoint 视图消失。 | 控制上下文长度；skill/delegation 不靠 summary 文本重建。 |
| TokenUsage | AIMessage usage/attribution；按 tool_call_id 的 subagent usage cache | Gateway stream/RunJournal/最终 token 汇总；父 delegation AIMessage | cache 在归并后消费/清理；message attribution 随 checkpoint。 | 补齐 lead+subagent 使用量；middleware 自己不负责向 LangSmith 发 metric。 |
| Title | ThreadState `title` | thread API / 前端 thread 列表；worker interrupted-title fallback | 生成后跨 run 保留，后续 AM no-op。 | 默认本地截断不增加 LLM call；配置 title model 才额外调用。 |
| MemoryMiddleware | 对 MemoryManager `add/aadd` 的调用，进入 debounce queue/backend | MemoryManager worker 与 memory backend；后续 DynamicContext recall | 正常 Gateway shutdown 按 timeout flush；异常退出时未 flush tail 可能丢失。 | 长期记忆写入发生在 graph 收尾之后，且 AA 不是所有路径必达；不属于当前 run 的原子 checkpoint 事务。 |
| ViewImage | ThreadState `viewed_images` + 临时 base64 HumanMessage | vision model | AM 用 RemoveMessage 立即删除临时 base64；轻量 viewed_images 仍在 thread state。 | 模型下一轮能看图，但不会把大 base64 长期塞进 checkpoint。 |
| McpRouting / tool_search | ThreadState reducer-backed `promoted` + catalog hash | DeferredToolFilter、SkillToolPolicy 的 schema/执行过滤 | thread 内累积；catalog hash 变化时旧 promotion 不再适用。 | 某个 deferred MCP schema 从“只有名称/metadata”转为对模型可见且可执行。 |
| Terminal / LLMError | AIMessage `deerflow_error_fallback` marker | Gateway worker 的 root values 扫描、RunJournal | 消息可进 checkpoint；worker 用 pre-existing message IDs 排除历史 run marker。 | 即使 graph 自然结束，当前 run 仍标 error，不把可见 fallback 误报为 success。 |
| Safety / ModelLength / TokenBudget / Loop / SubagentLimit | `runtime.context.stop_reason`；TokenBudget/Loop 另有实例内 stop map | Gateway worker final status；SubagentExecutor 通过 `consume_stop_reason()` 读取并 pop 实例 map | worker 在新用户可见 run 开始前清 stale context reason；subagent consume 会删除 map 项；AA 也清各自 bookkeeping。 | lead run row 或 subagent payload 带 capped reason；可有可用 partial result，不必改成 error。 |
| LLMError / Safety | custom stream event：`type=llm_retry` / `type=safety_termination` | StreamBridge → SSE custom event → 前端 | 事件流不进 thread checkpoint；由 stream 生命周期结束。 | 用户能看到 retry 次数、等待原因或 safety termination，而不是只等最终消息。 |
| Guardrail / Safety / Skill secret binding | RunJournal action：deny/allow-after-provider-error、suppress_tool_calls、bind_secrets 等 | 运行审计存储与诊断 | 按 run journal retention；写失败为 best-effort，不回滚已做的执行裁决。 | 安全决策有审计证据，但 journal 不是执行门禁本身。 |
| ToolOutputBudget | thread outputs 下 `.tool-results` 文件 + 摘要 ToolMessage | read_file、artifact/delivery 路径、后续模型 | 按 thread workspace 生命周期清理；不是 checkpoint blob。 | 大结果不占满上下文，但全文变成文件权限与保留问题。 |
| Clarification | `Command(goto=END)` + `human_input` artifact + text fallback | LangGraph router、Gateway stream、DeerFlow 前端 clarification card | 当前 run 直接 END；用户回答产生新 run，artifact 随消息/运行记录保留。 | 把模型给出的待澄清文本适配成前端交互协议；这是 DeerFlow 产品耦合，不是通用 harness 原语。 |

# 为什么默认关闭或条件开启

| 能力 | 触发条件 | 不开启的原因 |
|-|-|-|
| Authorization Guardrail | `authorization.enabled=true` 且 provider 可解析 | 不存在适用于所有部署的身份/资源策略；错误默认会改变访问矩阵。当前还存在与显式 Guardrail 同名冲突。 |
| Explicit Guardrail | `guardrails.enabled=true` 且 provider 已配置 | 需要明确 policy provider、passport、fail-open/closed 选择；框架不能安全猜测。 |
| ToolProgress | `tool_progress.enabled=true` | 按错误类型与近重复文本推断“没有新信息”，属于启发式状态机；直接 block 的误判代价高，且依赖 tool meta 完整。 |
| Todo | `is_plan_mode=true` | 计划模式才需要 todo tool、提醒和自动 re-engagement；普通问答开启会增加 prompt、状态和模型调用。 |
| ViewImage | 所选 model `supports_vision=true` | 非视觉 provider 不能消费 image_url；注入 base64 也有显著 IO 与 token/请求体成本。 |
| MCP routing + DeferredFilter | `tool_search.enabled=true` 且有 MCP tools；routing 还需 prefer metadata | 开启会从“schema 全量 eager”切换成“名称可见、schema promotion 后可见”，这是行为与兼容性选择，不是无成本优化。 |
| SubagentLimit | `subagent_enabled=true` | 不开 subagent 时没有 task tool；开启后它是硬裁剪，不是排队型 slot 控制。 |
| TokenBudget | `token_budget.enabled=true` | 阈值是部署成本与任务完成度的业务决策。错误通用值会静默迫使长任务提前收尾。 |
| Custom / Extension | 调用方传入或配置 class path | 框架无法预知 hook、依赖、名称唯一性、线程安全和多租作用域，默认必须为空。 |

# 维护与新增 middleware 的检查清单

1. **先定插入点：**一次 run 前后用 BA/AA；每个模型循环前后用 BM/AM；需要 around、短路或 retry 才用 WM/WT。
2. **同时写出正序与反序：**声明“我需要在谁之前进入、在谁之后看到结果”，不能只说 append 在某项前面。
3. **声明状态 owner：**state/checkpoint、runtime.context、实例 dict、模块全局、provider、磁盘/数据库分别由谁生产、谁消费、何时清理。
4. **声明 scope key：**user_id、thread_id、run_id、tool_call_id、sandbox_id 或 path；缺 key 时是 fail-open、fail-closed 还是共享 fallback。
5. **验证 Gateway 与复用 graph 两种生命周期：**fresh-per-run 下跨-run设计可能失效；cached graph 下未分区实例状态可能跨 user 串扰。
6. **验证名称唯一：**LangChain 以 `middleware.name` 建图；同类多实例必须覆盖唯一 name。
7. **验证 provider 协议：**新增 SystemMessage 必须在 coalescing 前；新增 tool call 变换必须保持 AIMessage↔ToolMessage 配对；新增 jump_to 必须用 hook_config 声明可达目标。
8. **验证跨层收尾：**如果 middleware 只埋 marker，必须同时给出 worker/executor/frontend 的消费位置和失败语义，避免“生产标记与提取处理不在一层”而无人维护。

# 源码索引

- Lead composition root：`packages/harness/deerflow/agents/lead_agent/agent.py:273-478`
- 共享 runtime 前 14 项：`packages/harness/deerflow/agents/middlewares/tool_error_handling_middleware.py:155-311`
- LangChain hook 筛选、wrapper 组装与正反序 graph edges：`.venv/lib/python3.12/site-packages/langchain/agents/factory.py:1079-1146, 1592-1775`
- Gateway 每 run 构建 agent 与收尾提取：`packages/harness/deerflow/runtime/runs/worker.py:683-756, 908-984`
- DeerFlowClient graph cache：`packages/harness/deerflow/client.py:261-390`
- 标准产品开关：`config.example.yaml` 中 token_usage、token_budget、tool_search、tool_output、loop_detection、tool_progress、read_before_write、safety_finish_reason、title、summarization、memory、authorization/guardrails。

**维护边界：**本文是对上述 commit 的源码参考。middleware 顺序、LangChain hook 编译规则、Gateway agent 生命周期或配置默认值变化后，需要重新核对执行图、默认状态和作用域结论。
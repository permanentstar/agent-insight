<title>DeerFlow Agent Prompt 设计方法论：分层、标签与作用域</title>

<callout emoji="💡">
**核心结论：**DeerFlow 的 Prompt 不是一段巨型字符串，而是一套“静态宪法 + 能力目录 + 持久状态 + 单次调用覆盖 + 独立子任务 Prompt”的组合系统。设计新阶段或插件时，最重要的不是先写措辞，而是先决定它的**权威等级、生命周期、注入位置和退出条件**。
</callout>

# 阅读目标与适用范围

本文面向熟悉 Python、LangChain 或 LangGraph，正在设计可扩展 Agent 的工程师。读完后应能够：

- 解释 DeerFlow 的系统 Prompt 是怎样由多个区块组装出来的；
- 判断一段阶段性指令应该放在静态 system prompt、graph state，还是单次 ModelRequest；
- 理解 XML-like 标签在语义分区、信任边界和渐进式加载中的作用；
- 为新 middleware、Skill 或子 Agent 选择正确的 Prompt 覆盖范围；
- 避免 Prompt 污染、上下文膨胀、权限混淆和跨阶段残留。

**源码基线：**本文依据 2026-08-19 当前 DeerFlow backend checkout 与其虚拟环境中安装的 LangChain/LangGraph 源码整理。重点分析 lead agent 主路径；具体配置和实现以后续版本源码为准。

# 先建立正确心智模型：Prompt 是运行时组合，不是单文件

从产品视角看，最终发给模型的输入由多个不同生命周期的来源叠加。可以把它理解成一条编译与运行流水线：

```text
产品配置 / Agent 配置 / SOUL / Skills / Subagent 能力
                     ↓ 构建期
             SYSTEM_PROMPT_TEMPLATE
                     ↓ create_agent()
       静态 system_message + middleware graph
                     ↓ 每个 run / 每轮 model call
     before_agent → before_model → wrap_model_call
                     ↓
   最终 ModelRequest(system_message, messages, tools)
                     ↓
                  Chat Model
```

这里至少存在五类上下文：

| 层次 | 典型内容 | 主要目的 | 典型生命周期 |
|-|-|-|-|
| 静态宪法层 | role、行为原则、工作目录、引用规范 | 定义 Agent 的长期身份与默认行为 | 一个已构建 Agent 的全部 model calls |
| 构建期能力层 | Skill 索引、Subagent 类型、MCP 路由提示 | 告诉模型“有哪些能力、何时发现” | 本次 graph 构建结果 |
| 线程/Run 状态层 | 日期、上传文件、摘要、todo、delegation ledger | 保存执行过程中仍需恢复的事实 | 一个 run、一个 thread，或直到 compact |
| 单次调用覆盖层 | 循环警告、Token 警告、Skill 激活内容、输入净化 | 只影响当前 ModelRequest，不污染 checkpoint | 一次 model call |
| 独立子任务层 | 摘要 Prompt、标题 Prompt、Subagent system prompt | 隔离不同目标、工具和上下文 | 一次内部 LLM 任务或一个子 Agent run |

因此，“修改 Prompt”不是一个单一动作。它可能意味着：

- 重新构建整个 Agent 的静态行为；
- 向 checkpoint 增加可恢复状态；
- 只改写下一次模型请求；
- 启动一个拥有独立 Prompt 的内部模型任务；
- 改变工具可见性，而完全不增加自然语言指令。

# DeerFlow 的五条 Prompt 设计方法论

## 稳定内容与动态内容分离

DeerFlow 将不随用户和时间变化的内容放入 **SYSTEM_PROMPT_TEMPLATE**，把日期、用户记忆等动态信息移出静态模板。这么做不仅是代码整洁，更直接服务于模型的 prefix cache：稳定前缀可以跨调用复用，动态内容不会让整个系统 Prompt 每轮失效。

源码中的 DynamicContextMiddleware 明确采用 frozen-snapshot pattern：首次对话注入日期和可选记忆；同一天不重复注入；跨午夜再补一个轻量日期更新。

**可迁移原则：**先问“它是否真的每次都变化”。稳定规则放静态区；动态事实通过状态或请求覆盖注入。不要为了模板书写方便，把用户、时间、任务数据全部 format 进主 system prompt。

## 行为规则与事实数据分离

DeerFlow 不只区分内容，还区分权威来源：

- 框架拥有的日期和元数据使用 SystemMessage；
- 用户可编辑的 memory 即使被框架注入，也保留为 HumanMessage；
- 远程工具结果维持 ToolMessage 语义；
- 动态上下文中的状态数据会配套 authority contract，明确它是“数据而不是新指令”。

这是一个很重要的设计：**内容由服务器插入，不等于内容就应该获得 system 权威。**用户记忆、Skill 文件、上传文件名、网页内容都可能包含恶意或偶然的控制标签，必须按不可信数据处理。

## 先确定生命周期，再选择 Hook

DeerFlow 把生命周期选择落实在 LangChain middleware 的不同 hook 上：

- **before_agent：**每次 run 入口处理一次，适合当前用户请求、上传文件、日期等 run 初始化信息；
- **before_model：**Agent 循环中每次 model 节点前都会执行，适合 compact、todo 恢复等必须随状态变化重新判断的规则；
- **wrap_model_call：**包裹一次模型请求，适合临时提醒、输入净化、工具过滤和请求重排；
- **after_model：**观察模型输出并更新状态或决定是否继续，适合 delegation 记录、终止条件和结果修正；
- **wrap_tool_call：**围绕特定 action 执行，适合权限、错误归一化、输出裁剪和审计。

Hook 选择决定的不是“代码放在哪里”，而是 Prompt 会被看见几次、是否写入 checkpoint、compact 后是否仍然存在，以及失败重试时是否重复出现。

## 渐进式披露，避免把所有能力说明塞进主 Prompt

DeerFlow 对 Skill 采用分层披露：

1. 主 system prompt 中只放 Skill 索引或简短元数据；
2. 模型通过 describe_skill 或 read_file 发现详细内容；
3. 显式 /skill-name 激活时，middleware 才把完整 SKILL.md 注入一次模型请求；
4. Skill 引用、已加载状态和所需 secrets 由独立状态与策略机制维护。

同样的思想也用于 deferred tools 和 MCP：能力可以存在于运行时，但模型不一定一开始就看到所有 schema。Prompt 只负责说明发现方式，工具过滤 middleware 负责真正的可见性边界。

## Prompt 负责引导，代码负责硬约束

DeerFlow 的 system prompt 会写 “MAXIMUM N task calls” 或 “clarify first”，但产品并不只依赖模型服从。SubagentLimitMiddleware、ClarificationMiddleware、权限 middleware、TokenBudgetMiddleware 等会在运行时执行真正的限制。

**可迁移原则：**凡是涉及权限、计费、数据删除、并发上限、终止条件和安全隔离的规则，都必须有代码侧 enforcement。Prompt 是解释界面和行为先验，不是安全边界。

# 主模板如何组织：标签是语义模块，不是装饰

DeerFlow 的 SYSTEM_PROMPT_TEMPLATE 使用 XML-like 标签划分相对稳定的语义模块。主要区块包括：

| 标签 | 表达的内容 | 设计意义 |
|-|-|-|
| <role> | Agent 身份和最上层角色 | 提供稳定、自包含的身份锚点 |
| <soul> | 自定义 Agent 的人格与行为偏好 | 把产品人格与框架基础规则解耦 |
| <thinking_style> | 推理和行动前检查习惯 | 规定过程风格，而非业务事实 |
| <clarification_system> | 澄清条件、流程与工具使用 | 定义面向用户的不确定性处理策略 |
| <skill_system> / <skill_index> | Skill 发现方式与索引 | 支持渐进式加载，降低基础 Prompt 成本 |
| <subagent_system> | 委派收益、成本、限制与可用角色 | 集中定义 delegation policy |
| <working_directory> | 上传、workspace、outputs 等路径契约 | 把执行环境作为显式接口交给模型 |
| <response_style> | 回答风格 | 与任务执行规则分离，便于独立演进 |
| <citations> | 外部来源引用规范 | 对特定产品能力提供专门协议 |
| <critical_reminders> | 少量高优先级复述 | 在长 Prompt 尾部重新建立关键注意力 |

## 模板插槽只组装稳定模块

主模板通过 Python format 插槽拼装功能区块，例如 soul、skills_section、subagent_section、deferred_tools_section。一个简化后的结构如下：

```python
SYSTEM_PROMPT_TEMPLATE = """
<role>
You are {agent_name}.
</role>

{soul}
{self_update_section}

<thinking_style>
...
</thinking_style>

{skills_section}
{deferred_tools_section}
{subagent_section}

<working_directory>
...
</working_directory>
"""
```

这些插槽并不意味着任意插件都可以覆盖整个 Prompt。更好的做法是让每个 builder 只拥有自己的命名区块，并在未启用时返回空字符串。这形成了清晰的 ownership：Skill builder 维护 Skill 区，Subagent builder 维护委派区，SOUL 只维护人格区。

## 标签命名应表达“谁拥有、是什么、持续多久”

DeerFlow 的标签大体可分为四类：

- **规则区块：**role、thinking_style、clarification_system、critical_reminders；
- **能力目录：**skill_system、skill_index、subagent_system、mcp_routing_hints；
- **动态事实：**current_date、current_uploads、durable_context_data；
- **阶段提醒：**system-reminder、system_reminder、slash_skill_activation、goal_continuation。

设计新标签时，优先使用领域语义名称，不要使用 phase_1、temp_prompt、extra_instruction 这类缺少长期含义的名字。标签属性适合放短小、机器生成的元数据，例如 name、path、sha256、editable；长正文放入子标签，并标明 encoding。

```xml
<phase_context source="scheduler" scope="model_call" version="1">
  <objective>本阶段要完成什么</objective>
  <constraints>本阶段特有的约束</constraints>
  <data encoding="xml-escaped">来自外部的不可信数据</data>
</phase_context>
```

其中 source、scope、version 首先是给维护者和模型看的契约说明。除非代码实际解析或校验这些属性，否则它们不构成强制机制。

## 标签必须配套转义与信任边界

DeerFlow 会对来自 SOUL.md、Skill frontmatter、Skill 正文、memory、上传文件和远程工具结果的内容进行 HTML/XML 转义或控制标签中和。典型策略包括：

- 把不可信文本中的框架保留标签转成 &lt;tag&gt;，保留可读性但失去结构意义；
- 用户输入用 BEGIN/END USER INPUT 纯文本边界包裹；
- 用户自己输入的边界 token 会先被中和，避免提前闭合；
- 框架标签有显式 denylist，新增权威区块时测试会要求同步更新；
- 服务端标记使用 additional_kwargs，而不是仅靠扫描消息正文判断来源。

需要特别强调：XML-like 标签只是模型可理解的结构化提示，不是解析器级沙箱。真正的安全来自角色分离、转义、服务端元数据、权限检查和运行时策略的共同作用。

## 标签一致性也需要治理

当前源码同时存在 <system-reminder> 和 <system_reminder> 两种拼写，输入净化 denylist 必须同时覆盖。这是一个值得学习的反例：标签一旦成为框架协议，拼写漂移会增加防注入、测试和迁移成本。

建议建立保留标签注册表，至少记录：标签名、生产者、消费者、消息角色、是否持久化、转义规则和退役策略。

# 阶段与插件 Prompt 的作用域矩阵

| 注入方式 | 执行频率 | 是否进入 state/checkpoint | 覆盖范围 | 适用场景 |
|-|-|-|-|-|
| create_agent(system_prompt) | 构建时一次 | 通常独立于 messages state | 该 Agent 的全部 model calls | 身份、长期规则、稳定能力说明 |
| before_agent 返回 messages | 每个 run 一次 | 是 | 当前 run，且可能延续到后续 thread | 上传、日期快照、run 初始化事实 |
| before_model 返回 messages/state | 每次 model 节点前 | 是 | 当前及后续调用，直到被删除或 compact | 自动摘要、todo 恢复、循环状态 |
| wrap_model_call request.override | 每次被调用时 | 否，除非另行写 state | 单次 model call | 临时提醒、净化、工具过滤、payload 重排 |
| after_model state update | 每次模型返回后 | 是 | 影响后续 graph 循环和未来恢复 | 记录 delegation、终止原因、结果修正 |
| ToolMessage | 一次 tool call 后 | 是 | 后续 model calls，直到历史裁剪 | 工具事实、错误和 action 结果 |
| 独立 LLM 调用 | 按任务触发 | 只保存选定结果 | 摘要、标题等专属任务 | 目标与主 Agent 不同的内部计算 |
| Subagent system prompt | 创建子 Agent 时 | 属于子执行上下文 | 该子 Agent run | 角色、工具和上下文需要隔离的任务 |

## Middleware 顺序就是覆盖优先级的一部分

LangChain 对不同 hook 采用不同组合方式：

- before_model middleware 按注册顺序形成节点链；
- after_model 通常按逆序回收，使后注册的保护逻辑先看到模型结果；
- wrap_model_call 中，列表中的第一个 handler 是最外层 wrapper，能看到原始请求，并决定内层是否执行；
- 内层 wrapper 能看到外层对 request 的改写；模型返回后，响应沿相反方向回到外层。

```text
InputSanitization(
  ToolOutputBudget(
    ToolResultSanitization(
      ...
        SystemMessageCoalescing(
          actual_model_call
        )
      ...
    )
  )
)
```

因此插件不能只声明“我在 model 前注入一段 Prompt”，还必须声明：

- 它应位于哪些 middleware 的外层或内层；
- 它读取的是原始 request 还是其他插件改写后的 request；
- 它是否允许短路模型调用；
- 它与 system message coalescing、输入净化、tool filtering 的先后关系。

# DeerFlow 真实案例：同一种“提示”为什么放在不同位置

## Dynamic Context：持久事实，但按权威拆成两种角色

DynamicContextMiddleware 在 before_agent 阶段工作。首次对话时，它使用 ID-swap 技术把原始 HumanMessage 替换成：

1. SystemMessage：框架拥有的 current_date；
2. 可选 HumanMessage：用户拥有的 memory；
3. HumanMessage：真实用户输入，使用带 \_\_user 后缀的新 ID。

这些消息进入 graph state，因此后续 model calls 和 checkpoint 恢复都能看到。跨午夜时再追加日期更新；同一天不重复写入。这个案例展示了“需要跨调用稳定存在”与“必须区分内容权威”如何同时实现。

## Uploads：当前 run 的文件事实写入用户消息

UploadsMiddleware 只读取当前消息携带的文件元数据，将 <current_uploads> 区块前置到最后一条 HumanMessage，并保存 uploaded_files 状态。历史文件不持续塞入 Prompt，而是要求模型通过 list_uploaded_files 按需发现。

这是渐进式上下文的另一种形式：当前 turn 的强相关事实直接出现；历史资产只提供检索入口，避免 thread 越长 Prompt 越大。

## Slash Skill：正文单次注入，能力绑定可延续整个 run

用户以 /skill-name 显式激活 Skill 时，SkillActivationMiddleware 在 wrap_model_call 中插入隐藏 HumanMessage：

```xml
<slash_skill_activation>
  <user_request>...</user_request>
  <skill name="..." path="..." sha256="..." editable="...">
    <skill_content encoding="xml-escaped">
      ...完整 SKILL.md...
    </skill_content>
  </skill>
</slash_skill_activation>
```

该 reminder 通过 request.override 注入，不写入 graph state，因此完整 Skill 正文只覆盖当前 model call。与此同时，run context 会记录这次激活，用于后续 model calls 的 secrets 绑定与防重复激活。这里体现了两个不同生命周期可以并存：

- Skill 正文：单次调用作用域，降低长期上下文成本；
- 显式激活产生的运行能力绑定：run 作用域，由结构化 context 维护。

## Durable Context：状态持久化，渲染保持临时

摘要、delegation ledger 和 skill_context 存放在独立 state channel 中。DurableContextMiddleware 每次 model call 前读取这些 channel，把它们渲染成隐藏的 <durable_context_data> HumanMessage，同时加入一条 authority contract SystemMessage。

渲染使用 request.override，因此渲染结果不再次写入 checkpoint。这个模式非常值得迁移：

```text
Checkpoint 中保存结构化事实
        ↓ 每次调用重新投影
临时、限长、转义后的模型上下文
        ↓ 调用结束即丢弃
下一次从最新 state 重新生成
```

这样既能恢复状态，又不会在 messages 中不断复制同一份 summary 或 ledger。

## Todo：恢复提醒与继续执行提醒采用不同作用域

TodoMiddleware 有两类提示：

- 当历史被 compact、原 write_todos 消息消失，但 todos state 仍存在时，before_model 写入 todo reminder，使其进入状态并持续可见；
- 当模型试图在 todo 未完成时给最终答案，completion reminder 通过 wrap_model_call 注入下一次请求，不写入状态，并设置最多提醒次数避免无限循环。

同样是“提醒模型继续工作”，一个用于恢复持久语义，一个用于当前控制流纠偏，因此不能机械地放在同一 hook。

## Context Compaction：内部 Prompt 与 Lead Prompt 隔离

自动 compact 在 DeerFlowSummarizationMiddleware.abefore_model 中触发。达到 messages、tokens 或 fraction threshold 后，它启动专用摘要模型调用，把旧消息转换为 summary_text，并保留 active tail。

摘要 Prompt 使用 <existing_summary> 与 <new_messages> 区分旧摘要和新增历史；输入会先转义。摘要模型带 TAG_NOSTREAM，避免摘要 token 被前端误认为 Lead Agent 正在回答用户。

这说明当一个阶段拥有不同目标、输出格式或可见性要求时，不应该“覆盖 Lead Agent 的主 Prompt 后继续调用同一个语境”，而应使用独立 LLM task，只把结果写回明确定义的 state channel。

## System Message Coalescing：只修正传输形态，不改持久语义

部分兼容 OpenAI 的模型服务和 Anthropic 不接受多个或非首位 SystemMessage。SystemMessageCoalescingMiddleware 在最接近 provider 的 wrap_model_call 阶段，把静态 system_message 与 messages 中的 SystemMessage 合并成一条，并移除 request.messages 中的重复系统消息。

它只改当前请求 payload，不改 checkpoint。由此可以看到“模型提供方兼容性”属于 transport/rendering concern，不应该污染 Agent 的长期状态表示。

# 为新阶段或插件选择 Prompt 注入点

可以按下面的决策顺序选择：

1. **它是不是 Agent 长期不变的身份或规则？**是：放主 system prompt 的独立命名区块。
2. **它是不是当前 run 初始化时确定、之后要持续恢复的事实？**是：before_agent 写入 state。
3. **它是否需要在每次 model call 前依据最新 state 重新判断，并影响未来调用？**是：before_model 返回 state update。
4. **它是否只应影响一次模型请求，不应出现在 checkpoint？**是：wrap_model_call + request.override。
5. **它是否只与一个 tool/action 有关？**优先放 tool schema、tool description 或 wrap_tool_call 的 ToolMessage，而不是全局 Prompt。
6. **它是否拥有与主 Agent 不同的目标、输出和可见性？**使用独立 LLM task 或 Subagent prompt。
7. **它是否是权限、预算、删除或并发限制？**用代码 enforce，Prompt 只做解释。

## 推荐的单次调用插件模板

```python
class PhaseContextMiddleware(AgentMiddleware):
    async def awrap_model_call(self, request, handler):
        block = render_xml_escaped_phase_context(request.state)
        if not block:
            return await handler(request)

        reminder = HumanMessage(
            content=block,
            name="phase_context",
            additional_kwargs={"hide_from_ui": True},
        )
        overridden = request.override(
            messages=[*request.messages, reminder],
        )
        return await handler(overridden)
```

这个模板适用于临时阶段上下文。需要补齐的工程契约包括：输入来源、转义函数、字符预算、middleware 顺序、触发条件、重复调用行为，以及同步版本是否支持。

## 推荐的持久状态 + 临时渲染模板

```python
class DurableFeatureMiddleware(AgentMiddleware):
    def before_model(self, state, runtime):
        update = derive_structured_feature_state(state)
        return {"feature_state": update} if update else None

    async def awrap_model_call(self, request, handler):
        block = render_bounded_escaped_view(
            request.state.get("feature_state")
        )
        if not block:
            return await handler(request)
        return await handler(
            request.override(messages=[*request.messages, block])
        )
```

适合需要 checkpoint 恢复、但不希望每轮都向 messages 追加重复文本的能力。DurableContextMiddleware 就属于这个方向。

# 常见反模式及其后果

| 反模式 | 直接后果 | 更好的选择 |
|-|-|-|
| 把用户、时间、memory 全部 format 进主 system prompt | prefix cache 失效，重建成本增加 | 静态模板 + Dynamic Context |
| 插件直接替换完整 system_message | 覆盖其他能力区块，顺序冲突难以追踪 | 命名区块或 request 级增量 overlay |
| 临时警告写入 checkpoint | 跨 turn 残留、重复触发、污染历史 | wrap_model_call 临时注入 |
| 应持久的事实只存在 request.override | 下一次 tool loop 或恢复时丢失 | 结构化 state + 每次重新渲染 |
| 认为 XML 标签天然防注入 | 外部文本可伪造框架区块 | 角色隔离、转义、denylist、服务端标记 |
| 所有 Skill 正文常驻主 Prompt | 上下文和 tool schema 成本持续膨胀 | 索引、发现、显式激活、按需加载 |
| 用 Prompt 实现权限和调用上限 | 模型不服从时没有强制保障 | 运行时 middleware/guardrail enforcement |
| 忽略 middleware 注册顺序 | 净化、注入、coalescing 或过滤互相绕过 | 声明 outer/inner 契约并做集成测试 |

# Prompt 插件的工程测试清单

一个 Prompt 插件不应只做文案 snapshot。至少验证以下行为：

- **渲染正确：**启用、禁用、空数据、超长数据时输出符合模板；
- **作用域正确：**连续两次以上 model call 中，确认该区块出现或消失的时机；
- **持久性正确：**检查 checkpoint，确保临时 reminder 未写入；应恢复的数据确实存在；
- **compact 正确：**历史压缩后，关键状态能通过 state channel 或 reminder 恢复；
- **转义正确：**输入包含闭合标签、保留标签、边界 marker 时不能逃逸；
- **角色正确：**框架规则、用户数据、工具数据没有被错误提升权限；
- **顺序正确：**与 sanitizer、tool filter、system coalescer、error handler 组合时仍符合预期；
- **Provider 正确：**严格模型后端最终只收到合法的 leading SystemMessage；
- **流式正确：**内部摘要或辅助模型 token 不会冒充面向用户的回复；
- **成本正确：**测量每轮新增 token，验证渐进式加载确实降低常驻开销；
- **硬约束正确：**即使模型忽略文字规则，代码侧限制仍然有效。

# 一个可复用的设计评审表

给任何新 Prompt 区块或插件做评审时，可以要求作者回答：

1. 这个 Prompt 的生产者和 owner 是谁？
2. 内容是规则、能力目录、事实数据，还是临时提醒？
3. 来源是否可信？若不可信，在哪里转义和限长？
4. 它应影响一个 Agent、一个 thread、一个 run、一个 model call，还是一个 tool call？
5. 它是否进入 checkpoint？为什么？
6. compact、resume、retry 和跨午夜后会发生什么？
7. middleware 顺序如何定义？谁在它外层，谁在它内层？
8. 关闭插件后，Prompt 和 state 中是否还有残留？
9. 硬约束由哪段代码执行？
10. 如何观察和测试最终发给模型的 ModelRequest？

如果这些问题没有答案，说明设计还停留在“写了一段提示词”，尚未成为可维护的 Agent runtime contract。

# 源码导读路线

建议按以下顺序阅读，能把模板、构建、运行时注入和 LangChain 编译串起来：

1. **主模板与组装：**  
packages/harness/deerflow/agents/lead_agent/prompt.py  
重点：SYSTEM_PROMPT_TEMPLATE、get_skills_prompt_section、get_agent_soul、apply_prompt_template。
2. **Agent 构建与 middleware 顺序：**  
packages/harness/deerflow/agents/lead_agent/agent.py  
重点：build_middlewares、make_lead_agent、create_agent 调用。
3. **静态与动态分离：**  
packages/harness/deerflow/agents/middlewares/dynamic_context_middleware.py
4. **Skill 单次激活：**  
packages/harness/deerflow/agents/middlewares/skill_activation_middleware.py
5. **持久状态临时投影：**  
packages/harness/deerflow/agents/middlewares/durable_context_middleware.py
6. **输入边界与标签净化：**  
packages/harness/deerflow/agents/middlewares/input_sanitization_middleware.py
7. **自动上下文压缩：**  
packages/harness/deerflow/agents/middlewares/summarization_middleware.py
8. **单 SystemMessage 兼容层：**  
packages/harness/deerflow/agents/middlewares/system_message_coalescing_middleware.py
9. **阶段控制案例：**  
packages/harness/deerflow/agents/middlewares/todo_middleware.py
10. **LangChain 如何编译 hook：**  
.venv/lib/python3.12/site-packages/langchain/agents/factory.py  
重点：middleware_w_before_model、wrap_model_call handler composition、graph.add_node。

# 总结

DeerFlow 最值得借鉴的并不是某一句 Prompt，而是它把 Prompt 当成运行时架构的一部分：

- 静态规则追求稳定和可缓存；
- 动态事实通过角色和状态明确归属；
- 阶段性覆盖由 hook 生命周期约束；
- Skill 和工具采用渐进式披露；
- 持久状态与模型可见文本分离；
- 内部子任务使用隔离 Prompt；
- 标签负责语义结构，代码负责安全和强制。

设计 Agent Prompt 时，应从“这段文字是什么、谁拥有、影响多久、在哪里消失、由谁强制”开始，而不是从“system prompt 里还能追加什么”开始。做到这一点，Prompt 才会从不可维护的字符串，升级为清晰、可测试、可演进的运行时契约。
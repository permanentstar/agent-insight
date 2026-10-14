---
id: "langchain-components"
title: "LangChain：组合、消息、模型与工具契约"
subject: "langchain"
status: "verified-source"
baselines: ["langchain-20261009"]
sources: ["langchain-stage1", "langchain-stage2"]
depends_on: ["langchain-migrated"]
evidence: ["source"]
verified_scope: "核验 Runnable 组合、输入转换、消息文本视图及 BaseTool 异常边界；示例未运行，provider 能力需各自实现。"
---

# LangChain：组合、消息、模型与工具契约

Runnable 统一的是调用协议，不保证任意两个组件在数据类型、流式能力或工具支持上兼容。LCEL 是这套协议的组合语法；Agent 的循环由 [create_agent](architecture.md) 交给 LangGraph。

![输入经组合器、消息归一和模型适配到结果；工具从 schema 校验进入 handler，追踪配置沿调用传递](../../assets/framework-components.svg)


先把一次组件调用分成三次交接：组合器将前一步输出交给后一步，模型适配层将输入转换为消息，工具适配层将调用参数交给 handler 并包装返回。下面按这个顺序讲协议。流式和失败条件在对应阶段补充，用来解释相同调用形态为何可能产生不同结果。

| 当前位置 | 上层调用者 | 下层执行点 | owner / 生命周期 |
|---|---|---|---|
| 组合 | 用户构建链 | RunnableSequence / Parallel | 链持有步骤；一次调用创建回调子上下文 |
| 数据 | Prompt、用户输入或模型输出 | PromptValue、BaseMessage | 值对象；content 保留负载，不拥有网络连接 |
| 模型 | model.invoke / stream | partner 的 _generate / _stream | 集成对象持有客户端，调用产生 AIMessage / Chunk |
| 工具 | ToolCall 或普通入参 | BaseTool.run → _run | schema 与 handler 由工具定义；审批需上层另外提供 |

## 第一步：组合器传递输入与输出

`a | b` 将两侧按 coerce_to_runnable 规则装成 RunnableSequence，依次传递输出。映射可装成 Parallel，普通函数可装成 Lambda；这不是“任何类型都能自动对齐”。Parallel 给各分支同一个输入，输出是按键汇总的字典，调用配置控制并发。

| API | 基类默认行为 | 何时不能据此推断能力 |
|---|---|---|
| invoke | 抽象入口，子类实现 | 统一签名不提供数据 schema 的自动修复 |
| ainvoke | 用 executor 调同步 invoke | 没有原生异步实现时仍是线程执行 |
| batch | 多个 invoke；默认线程池，结果按输入顺序 | 某些集成重写为服务端 batch，不能套同一性能判断 |
| stream | 完整 invoke 结果 yield 一次 | 存在此方法不代表逐 token 输出 |
| Sequence.stream | 串联 transform | 中途缓冲组件会延迟后续输出；不是每个 Lambda 都能边收边发 |

类型标注帮助阅读与静态检查，运行时仍须确保前一步输出符合后一步输入。`prompt | model | parser` 的结果类型由最后一步决定；去掉 parser 返回消息，不能仍按字符串消费。证据：[Runnable 默认与组合](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/core/langchain_core/runnables/base.py#L887)、[Sequence 的流式限制](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/core/langchain_core/runnables/base.py#L3079)。

## 第二步：将输入归一为模型消息

`BaseChatModel._convert_input` 接受 PromptValue、字符串、消息序列；字符串先变 StringPromptValue，序列经 convert_to_messages。无效类型直接抛 ValueError。角色属于协议字段，不由 XML 标签或文本顺序替代。

| 数据 | 读法 | 使用边界 |
|---|---|---|
| content | 原始字符串或内容块 | 不同 provider 不保证形状相同 |
| content_blocks | 经过 translator 的标准块视图 | reasoning 与 text 仍是不同块；标准化不是把所有信息拼成答案 |
| .text | 提取字符串及 type=text 内容 | 不会保证读到 additional_kwargs 中任意推理字段；空文本不证明请求失败 |
| AIMessage.tool_calls | 已规范化的调用列表 | 还有无效调用与流式片段，不能把局部参数当完整调用 |
| ToolMessage | 工具结果，关联 tool_call_id | call/result 配对是上层会话契约，工具描述不能替代它 |

[输入归一](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/core/langchain_core/language_models/chat_models.py#L461)、[文本提取](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/core/langchain_core/messages/base.py#L263)、[AIMessage](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/core/langchain_core/messages/ai.py) 是三种不同边界。`.text` 只提取文本块，不能作为 reasoning 或工具结果为空时的通用修复。

模型接口的输入转换可以直接从源码读出：

```python
# BaseChatModel._convert_input 源码节选；仅省略错误信息的构造。
if isinstance(model_input, PromptValue):
    return model_input
if isinstance(model_input, str):
    return StringPromptValue(text=model_input)
if isinstance(model_input, Sequence):
    return ChatPromptValue(messages=convert_to_messages(model_input))
raise ValueError(msg)
```

随后 `invoke` 将这份 PromptValue 交给 `generate_prompt`，携带 callbacks、tags 和 metadata；具体 provider 执行后返回 AIMessage。比如 `prompt | model | parser` 中，prompt 先产出 PromptValue，模型产出 AIMessage，parser 再解释这份输出。省略 parser 后，消费方必须改为读取消息对象。[查看输入归一与 invoke 的相邻路径](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/core/langchain_core/language_models/chat_models.py#L461)。

## 第三步：校验工具参数并包装执行结果

`@tool` 在构建期包成 StructuredTool，参数来自签名、args_schema 与可选 docstring 解析。调用期 BaseTool 验证参数、处理注入字段、调用 `_run/_arun`，最后按是否含 tool_call_id 格式化结果。模型可见 schema、运行时对象、实际执行权限分属三层。

| 失败 | BaseTool 默认结果 | 可配置变化 |
|---|---|---|
| Pydantic 参数错误 | 抛出 | handle_validation_error 可转成错误反馈 |
| ToolException | 抛出 | handle_tool_error 可生成 status=error 的 ToolMessage |
| 普通 Exception / KeyboardInterrupt | 记录 on_tool_error 后抛出 | 上层 ToolNode / middleware 可能另行处理，不能混算到 BaseTool |
| content_and_artifact 返回格式错误 | 抛 ValueError | content 给模型，artifact 是旁路数据；格式必须符合约定 |

证据：[tool 转换](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/core/langchain_core/tools/convert.py)、[BaseTool 结果与异常](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/core/langchain_core/tools/base.py#L1105)。

以 `read_source(path)` 为例，模型给出的参数先进入工具 schema；`BaseTool._to_args_and_kwargs` 调 `_parse_input` 校验，然后准备 handler 的位置参数或关键字参数。handler 返回后，框架根据 `tool_call_id` 包装结果，Agent 图才得到配对的 ToolMessage。因此模型描述能否生成、参数能否通过、handler 是否执行是连续的三个问题。

```python
# 按 _to_args_and_kwargs 整理的源码骨架，省略空 schema 特例与错误文本。
tool_input = self._parse_input(tool_input, tool_call_id)
if isinstance(tool_input, str):
    return (tool_input,), {}
if isinstance(tool_input, dict):
    return (), tool_input.copy()
raise TypeError(msg)
```

复制参数字典允许下游注入运行资料，同时保留原调用输入。权限放行由更上层或 handler 的实际效果路径承担；参数 schema 只解决数据契约。[查看参数准备与 run](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/core/langchain_core/tools/base.py#L965)。

## 集成能力与取舍

BaseChatModel.bind_tools 的基类实现是 NotImplementedError；with_structured_output 也依赖具体绑定支持。因此工具绑定能力取决于具体模型适配器。结构化输出适合 schema 明确的结果；文本 parser 仍适合文本处理，不能因 v1 Agent API 更薄就说 parser 被废弃。

固定链、Agent 图和节点内组件可以相互组合。一个图节点内部仍可使用 LCEL；三种路线——固定链、create_agent、显式 StateGraph——按控制权需求组合，不能按新旧排成淘汰关系。

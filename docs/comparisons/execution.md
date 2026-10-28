---
id: "comparison-execution"
title: "比较：工具、扩展与执行边界"
subject: "comparison"
status: "index"
baselines: ["pi-20261009", "deerflow-20261009", "codex-20261009", "hermes-20261009", "langchain-20261009", "langgraph-20261009", "deepseek-20261009", "claude-source-20260331", "pi-20261019"]
sources: []
depends_on: ["pi-architecture", "durable-architecture", "deerflow-migrated", "claude-migrated", "codex-plan", "hermes-migrated", "langchain-migrated", "langgraph-migrated", "deepseek-plan", "pi-loop", "pi-extensions", "deerflow-middleware", "pi-platform", "deerflow-capabilities", "codex-context", "deepseek-capabilities", "comparison-control"]
evidence: ["source", "historical-document", "static-inference"]
verified_scope: "九对象的代表工具路径、扩展和并发/取消边界静态比较；不是全平台权限审计。"
---

# 比较：工具、扩展与执行边界

工具是否可发现、参数能否受理、效果是否允许执行，需要分别控制。hook 的名字不足以说明职责，必须追到它何时调用 handler、何时返回、读写哪个状态。下表围绕“模型给出一条工具调用”这个共同输入比较。

![工具定义进入本次可见集合，参数校验和实际控制通过后才执行 handler，再核销结果；注册和发现不等于授权](../assets/comparison-execution.svg)


主线按五份契约展开：定义与本次可见集合、参数受理、最终效果政策、handler 执行、关联结果回填。先沿一项修改走完整条链，再讨论参数被 hook 改写和多工具批次；实现对照用来定位这些职责分别在哪一层生效。

## 一次工具调用跨过五份契约

在 CSV 任务中，模型请求 apply_patch。为了理解这一动作，先看一条教学调用：

```json
{"id":"edit-1","name":"apply_patch",
 "arguments":{"path":"src/export.ts","change":"按项目规则修复字段转义"}}
```

change 在这里用于表达教学意图；真实 patch 工具会有更具体的参数协议。程序执行它以前，需要将调用与当前工具定义、最终参数和执行环境对齐。

| 契约 | 负责的问题 | 在本次调用中的资料 |
|---|---|---|
| 发现与定义 | 当前有哪些可描述的能力？ | 工具名、用途、参数 schema |
| 本次可见性 | 这次请求公布了哪些工具？ | 请求中绑定的工具集合 |
| 参数受理 | 调用能否进入对应 handler？ | 名字、参数类型、修复及校验结果 |
| 执行政策 | 最终动作是否获准？ | 资源、当前身份、批准及环境规则 |
| 效果与反馈 | 实际发生了什么，如何回到模型？ | handler 结果、调用 ID、消息或记录 |

把这五份契约分开，才会知道不同失败发生在哪一层。工具隐藏只改变可见性；handler 注册只说明有代码可调用；模型给出参数只说明有请求。执行控制必须位于效果经过的路径。

## 输入可被修改时，检查哪一份参数

有些工具会规范化参数，hook 也可能修改或阻断调用。若审批检查原始参数，而后续效果使用了另一份参数，就无法只凭早先检查解释最终行为。正确的分析顺序是：找原调用，追参数变化，确定效果使用的最终值，再核对检查在哪个阶段。

Pi Durable 的 call 阶段在 beforeTool 以后再次校验最终参数，提交 execute intent，再执行效果。Codex 相应效果工具从 router、registry 进入具体 handler，再由 handler 连接 orchestrator 和 runtime；DeerFlow 的工具策略既过滤请求中的 tools，也在 wrap_tool_call 再判断。这些机制在相近职责上生效，但流程及保证范围仍要按各自实现解释。

以 Codex 的 apply_patch 为例，handler 已准备有效 request 后，显式创建效果编排器与 runtime：

```rust
let mut orchestrator = ToolOrchestrator::new();
let mut runtime = ApplyPatchRuntime::new();
let result = orchestrator
    .run(&mut runtime, &request, &tool_ctx)
    .await
    .map(|result| result.output);
```

这是源码节选，省略 request 构造和完成事件。orchestrator 按 request 与上下文处理审批和执行尝试，runtime 落实修改；其他 handler 可以有不同路径，例如清单工具直接发事件。共同契约需要沿具体操作验证，不能由编排器存在推定所有工具都经过它。[查看 apply_patch 的实际连接](https://github.com/openai/codex/blob/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4/codex-rs/core/src/tools/handlers/apply_patch.rs#L546)。

## 结果是下一请求的观察，不是自动验收

工具返回“修改完成”时，下一模型请求获得新的观察；验证是否通过，还要有验证工具或其他明确资料。工具 result 的 status、内容与最终用户目标分别属于动作、语义和业务判断层。

结果过大时可以裁剪、保存外部 artifact、改变模型可见贡献或摘要。原始输出、当前请求中的片段、引用位置和结果状态应当能解释其关系，不能只有一段短文本而无法判断它来自哪次调用。

## 多工具批次怎样保持可解释性

一个 assistant 可以同时请求读规则和读代码。执行器可以串行，也可以在策略允许时并行；返回时仍需要维持调用与结果对应。工具真实结束顺序、UI 进度顺序、模型消息顺序不必相同。

对于下一步修复，模型应获得这批已采用的观察。程序不能凭“两个任务都创建了”就把它们视为已有结果，也不能靠工具名字是 read 就无条件推断并发安全。具体声明与处理点见下面的实现对照。

**演算。** 当前请求的工具 schema 包含 edit，用户因此已经批准所有 edit 吗？

参考解答：没有。schema 说明模型可以表达这种动作，执行政策还要对本次具体参数、资源和环境判定。能力发现与效果授权是不同职责。


## 在各实现中定位同一效果链

下表保留相同列，比较效果点、生命周期和返回边界。先找参数怎样到达 handler，再解释 hook、并发和取消；这样一个框架提供的控制入口与产品实际采用的策略就能分别判断。

| 对象 | 权威状态与所有者 | 构造与生命周期 | 实际机制与执行点 | 提供的能力 | 机制边界 | 深入阅读 |
|---|---|---|---|---|---|---|
| AgentSession | AgentSession 资源/runner；Agent 工具循环 | 定义加载后注册和激活；reload 更换绑定 | input/beforeTool/afterTool → prepare/execute/finalize | 调用 hook 可 block，结果 hook 可变换输出 | 不由激活推定完整权限；子 Agent 未穷举 | [Pi](../agents/pi/architecture.md) |
| Pi Durable，实验库 | Registry 工具定义；pi.tool Task | 每 invocation 建子 Task，持久 JSON 与代码分开 | beforeTool 后复核参数 → intent → execute → outcome | 保存最终参数及 replay 条件 | 事务不回滚外部效果；内核能力需另接产品接口 | [Pi Durable](../agents/pi-durable/architecture.md) |
| DeerFlow，应用 | 产品 policy/middleware；工具 handler | 最终扩展 compose 后绑定图；实例随图复用 | SkillToolPolicy 同时过滤 schema 和包住 handler | 代表阻断路径不调用实际 handler | 不代表全部 policy/sandbox 已审计 | [DeerFlow](../agents/deerflow/architecture.md) |
| Claude | 历史 Tool 定义、executor 与 canUseTool | REPL 绑定权限 UI；deferred schema 按需发现 | 校验/allow-deny-ask → call；安全可并行组 | 历史解释可见性、知识与执行分开 | in-process 投信与模型输入已有链；跨崩溃确认未证 | [Claude](../agents/claude/architecture.md) |
| Codex，开源 core | ToolRouter/registry；ToolOrchestrator/Runtime | StepContext 给本次请求固定 router；按工具分派 | 审批需求 → sandbox attempt → Runtime.run | 代表执行工具受审批与环境编排 | 不同工具与嵌套调用需要各自消费授权和环境约束 | [Codex](../agents/codex/architecture.md) |
| Hermes，原生路径 | toolsets/registry；executor/middleware | AIAgent 配置；单轮分段串行/并行 | handle_function_call → middleware → dispatch | 代表结果按调用顺序回填 | transform_result 错误保留原结果；非统一门禁 | [Hermes](../agents/hermes/architecture.md) |
| LangChain，构图框架 | middleware 定义与 AgentState；ToolNode | create_agent 组合 hooks，wrap 首项外层 | before 正向/after 反向；model/tool request wrapper | 组合与 override 顺序有明确控制点 | 应用组合需按依赖语义判断；鉴权由应用提供 | [LangChain](../frameworks/langchain/architecture.md) |
| LangGraph，执行框架 | 图节点/retry policy；应用工具实现 | compile 注册；runner 在超步调度 task | 节点/ToolNode 执行并提交 writes | 负责调度和状态，不替应用解释业务权限 | 节点名不能证明 sandbox 或外部授权 | [LangGraph](../frameworks/langgraph/architecture.md) |
| DeepSeek，developer preview | ctx.tools、调用记录与插件 scope | profile 装配；工具批次用受限滚动并发池 | tool/call → ordered prepare/pre-execute → dispatch/body → ordered finalize/result | checkpoint policy 可在效果前设 flush 屏障 | sandbox 的 full/partial 保证按后端判断；嵌套调用非独立 intent | [DeepSeek](../agents/deepseek/architecture.md) |

## 同一输入与观察边界

| 场景 | 静态机制差异 | 比较时保留的限制 |
|---|---|---|
| 工具已注册但不在本次 schema | Pi active loadout、Claude deferred tools、DeerFlow policy 均涉及可见集合 | 找到定义不代表可调用，更不代表授权 |
| hook 拦截调用 | Pi beforeTool 可 block；DeerFlow 代表 policy 可返回 blocked ToolMessage | 要验证实际 execute/handler 未进入，不只读过滤列表 |
| hook 改参数 | Pi Durable 再校验并提交有效 intent | 不将其他同名 hook 推成相同恢复语义 |
| 多工具同时推进 | Pi 策略；Hermes 分段；DeepSeek 滚动池；图 task 调度 | 并发执行、结果次序、提交次序分别比较 |
| 停止等待或取消 | Pi Durable wait 取消与 abort 分开；其他对象有 Op/token/interrupt 等路径 | 观察方结束不等于工具取消，更不撤回外部效果 |
| 看见流事件 | Pi/Codex/DeepSeek 的临时事件，图的 updates/messages 与持久写分开 | 展示、落库与业务成功分别给证据 |

## 一次工具内部还有程序时

Durable 的 executeTool 将每个嵌套调用做成独立 pi.tool Task，按父任务和 key 重接已有结果，hooks、校验和 replay 规则仍在实际调用路径上。codemode 再以日志重放恢复脚本，模型最终收到外层调用的结果。DeepSeek 的嵌套工具在本书基线复用外层持久屏障，不能据相似 API 推定两者拥有相同的中断恢复粒度。[嵌套工具与脚本](../agents/pi-durable/tools.md)、[DeepSeek 持久屏障](../agents/deepseek/context.md)。

## 子 Agent、扩展与条件化取舍

[委派比较](control-delegation.md)已展开 child 图、线程、AIAgent 和 activation 的生命周期：DeerFlow child checkpointer=False，Codex 先准入并保留容量，Hermes 返回具名 child status，DeepSeek 区分本地多轮 Session 与外部一次 run。Pi Durable 提供前后台子会话的组装示例，产品入口由宿主提供。**有 task 工具或类名不是统一的多 Agent 协作保证。**

进程内交互扩展可直接绑定会话/UI；可恢复扩展必须把函数定义、持久参数、进度与重放规则分别管理。应用 policy 适合表达用户、技能和环境约束，通用框架负责按既定控制点执行；组合后仍应沿效果点验证控制生效。不同工具类型与控制点承担不同职责，能力比较需要固定操作和环境。

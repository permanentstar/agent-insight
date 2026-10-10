---
id: "comparison-execution"
title: "比较：工具、扩展与执行边界"
subject: "comparison"
status: "index"
baselines: ["pi-20261009"]
sources: []
depends_on: ["pi-loop", "durable-architecture", "deerflow-index", "claude-index", "codex-index", "hermes-index", "langchain-index", "langgraph-index", "deepseek-index"]
evidence: []
verified_scope: "Pi 工具执行与持久边界的代表机制比较；全部权限安全性和多 Agent 运行未验证。"
---

# 比较：工具、扩展与执行边界

工具定义可发现、请求可受理和效果可执行是三种边界。比较 hook 时先定位实际调用阶段，不能把都叫 hook 的机制视为相同。

| 对象与阶段 | 权威状态 owner | 构造与生命周期 | 实际机制与执行点 | 能保证什么 | 不能保证/未核验 | 证据页 |
|---|---|---|---|---|---|---|
| AgentSession，默认，pi-20261009 | 产品扩展与 Agent hook 分层 | 资源加载后配置 Agent；工具调用在单次运行内 | agent-loop prepare/execute/finalize，顺序或并行策略 | 工具调用阶段可追到实际 execute | 全部权限路径与子 Agent 未完整核验 | [循环章](../agents/pi/loop.md) |
| Pico5，实验，pi-20261009 | registry 定义；Task record 与 Document 状态 | 工具作为 pi.tool 子 Task，运行句柄按 invocation 创建 | beforeTool 后复核参数；intent 提交后 execute，再提交结果 | 恢复使用保存后的有效参数和 replay policy | 事务不回滚外部效果；服务可见性不等于内核能力 | [工具状态](../agents/pi-durable/architecture.md) |
| DeerFlow，旧文待核验 | middleware/tool owner 待核验 | 待核验 | 需追 hook 到效果点 | 未知 | 尚未刷新当前顺序与作用域 | [分册](../agents/deerflow/index.md) |
| Claude，冻结快照 | 历史工具/权限材料 | 快照版本未知 | 仅历史材料 | 不声明当前保证 | 不反推当前线上权限实现 | [分册](../agents/claude/index.md) |
| Codex，待源码分析 | 待核验 | 待核验 | 待核验 | 未知 | 官方使用规则不能代替执行证明 | [分册](../agents/codex/index.md) |
| Hermes，旧文待核验 | 待核验 | 待核验 | 待核验 | 未知 | 平台和工具路径未完整刷新 | [分册](../agents/hermes/index.md) |
| LangChain，旧文待核验 | 待核验 | 待核验 | 待核验 | 未知 | 中间件须核对实际应用版本 | [分册](../frameworks/langchain/index.md) |
| LangGraph，旧文待核验 | 待核验 | 待核验 | 待核验 | 未知 | 图节点调度与外部执行分别证明 | [分册](../frameworks/langgraph/index.md) |
| DeepSeek Harness，待分析 | 待核验 | 待核验 | 待核验 | 未知 | 尚无工具机制结论 | [分册](../agents/deepseek/index.md) |

以下按更细的执行问题展开已核验的两套 Pi 架构；后续新增对象仍先补上方固定列。

| 维度 | AgentSession | Pico5 | 其余对象如何补证 |
|---|---|---|---|
| 工具生命周期 | agent-loop 的 prepare / execute / finalize | pi.tool Task，intent 与结果提交包住真实 execute | 跟到 handler 与实际效果点 |
| 执行阻断 | 工具 hooks 路径，nested tool 也需追同一路径 | beforeTool 可 block 或改参数，随后重新校验 | 名称不能证明授权生效 |
| 扩展状态 | 产品 extension/resource 与 Agent hook 分层 | registry definitions、documents、task phase 分层 | 定义、实例、配置与持久状态逐项归属 |
| 并发 | 支持 sequential/parallel 策略 | 子 Task 与统一 Session mutation line | 同时执行不等于同时提交 |
| 子 Agent | 本版未完整核验 | 服务层暂只暴露 root conversation，不能推定无子会话能力 | 产品服务可见性与内核能力分开 |
| 观测 | listener event 和历史写入有先后 | committed progress/view | 流事件、状态落库、业务成功分别证明 |

场景：hook 改写工具参数。Pico5 在 beforeTool 后再次校验并将最终参数存 intent；因此恢复依据的是保存后的有效参数。AgentSession 要按 prepare/execute/finalize 的实际钩子追踪，不能用同名钩子推断相同事务边界。

取舍：同步进程内扩展更容易组合 UI 行为；可恢复扩展要把函数定义与持久 JSON 状态分开，并明确兼容和重放规则。这个区别是工程条件，初版不做“插件能力更强”的无条件排名。

证据：[循环章](../agents/pi/loop.md)、[Pico5 工具状态](../agents/pi-durable/architecture.md)。DeerFlow、Claude、Codex、Hermes、LangChain、LangGraph、DeepSeek 的各格当前待核验；共同维度不省略。

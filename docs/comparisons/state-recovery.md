---
id: "comparison-state"
title: "比较：上下文、持久化与恢复"
subject: "comparison"
status: "index"
baselines: ["pi-20261009"]
sources: []
depends_on: ["pi-context", "durable-architecture", "durable-glossary", "deerflow-index", "claude-index", "codex-index", "hermes-index", "langchain-index", "langgraph-index", "deepseek-index"]
evidence: []
verified_scope: "Pi 两对象的消息/工作/效果恢复层次已比较；无性能或崩溃运行测量。"
---

# 比较：上下文、持久化与恢复

比较恢复能力时，先问恢复的是消息、工作状态还是外部效果。保存历史与恢复 Task 不是同一保证。

| 对象与阶段 | 权威状态 owner | 构造与生命周期 | 实际机制与执行点 | 能保证什么 | 不能保证/未核验 | 证据页 |
|---|---|---|---|---|---|---|
| AgentSession，默认，pi-20261009 | SessionManager 历史树；Agent 当前消息 | session 文件重建上下文；活动执行在进程内 | parent 链选分支，压缩/context edit 形成投影；message_end 可先 emit 再 append | 历史与当前模型上下文有明确转换 | 未证明活动工具崩溃恢复；未测刷盘耐久性 | [历史与上下文](../agents/pi/context.md) |
| Pico5，实验，pi-20261009 | Session entries/tasks/documents | Task record 可恢复；registry 提供当前运行代码 | Session 提交后发布对应进度；tool 按 intent/replay 恢复 | 持久工作状态与恢复依据明确 | 外部效果不能由事务推成恰好一次；耐久性取决于 Storage | [持久架构](../agents/pi-durable/architecture.md) |
| DeerFlow，旧文待核验 | checkpoint/graph state 待核验 | 待核验 | 副作用边界待核验 | 未知 | 当前尚未补证 | [分册](../agents/deerflow/index.md) |
| Claude，冻结快照 | 历史材料待复核 | 快照版本未知 | 仅历史材料 | 不声明当前保证 | 不追踪线上变化 | [分册](../agents/claude/index.md) |
| Codex，待源码分析 | rollout/活动任务关系待核验 | 待核验 | 待核验 | 未知 | 官方实践不能代替恢复机制 | [分册](../agents/codex/index.md) |
| Hermes，旧文待核验 | SessionDB/工具状态待核验 | 待核验 | 待核验 | 未知 | 保存会话不等于保存工具 checkpoint | [分册](../agents/hermes/index.md) |
| LangChain，旧文待核验 | 应用与框架归属待核验 | 待核验 | 待核验 | 未知 | 需记录应用锁定组合 | [分册](../frameworks/langchain/index.md) |
| LangGraph，旧文待核验 | checkpoint/graph state 待核验 | 待核验 | 副作用边界待核验 | 未知 | 未做故障验证 | [分册](../frameworks/langgraph/index.md) |
| DeepSeek Harness，待分析 | 待核验 | 待核验 | 待核验 | 未知 | 尚无恢复结论 | [分册](../agents/deepseek/index.md) |

同一故障：工具写外部系统成功，但提交结果之前进程崩溃。Pico5 的 durable intent 能说明工作走到了 execute，却不能自动判断外部系统究竟成功；unsafe 策略避免盲目重放并给出 interrupted。若需要跨系统恰好一次，还必须设计外部幂等键或核对接口，不能由本比较宣称现有框架已经保证。

DeerFlow 与 LangGraph 应补 checkpoint/graph state/副作用边界；Hermes 应补 SessionDB 与工具 checkpoint 的差异；Codex 应补 rollout 与活动任务；Claude 仅历史；DeepSeek 新分析。所有这些当前均待核验，不依据旧名称推定恢复能力。

取舍：需要所有展示进度都可重建时，Pico5 的提交后可见契约更直接；代价是进度提交与存储性能、任务定义兼容及恢复状态的治理。压缩比较必须先统一逻辑覆盖边界，不能用文件物理时间顺序替代状态关系。

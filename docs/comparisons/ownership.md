---
id: "comparison-ownership"
title: "比较：所有权与生命周期"
subject: "comparison"
status: "index"
baselines: ["pi-20261009", "deerflow-20261009", "codex-20261009", "hermes-20261009", "langchain-20261009", "langgraph-20261009", "deepseek-20261009", "claude-frozen-documents"]
sources: []
depends_on: ["pi-architecture", "durable-architecture", "deerflow-migrated", "claude-migrated", "codex-plan", "hermes-migrated", "langchain-migrated", "langgraph-migrated", "deepseek-plan"]
evidence: ["source", "historical-document", "static-inference"]
verified_scope: "九对象的代表性构造与状态归属静态比较；Claude 仅历史转述；不证明并发与释放的全部运行性质."
---

# 比较：所有权与生命周期

长期会话身份、进程活对象和一次执行需要分别管理。多数应用把会话历史和运行句柄分开；Pico5 与 LangGraph 又显式保存工作恢复资料，但其可恢复单元不同。比较问题是：第二次输入或进程重启后，哪些对象复用，哪些状态重建？

| 对象与阶段 | 权威状态 owner | 构造与生命周期 | 实际机制与执行点 | 能保证什么 | 不能保证/未核验 | 证据页 |
|---|---|---|---|---|---|---|
| AgentSession，官方默认；`pi-20261009` | AgentSession 编排，Agent 活运行，SessionManager 历史 | CLI/SDK 创建或注入；runtime 可替换 session | prompt → Agent / agent-loop | 会话、执行、历史责任分开 | 历史保存不能证明活工作可恢复 | [Pi](../agents/pi/architecture.md) |
| Pico5，实验；`pi-20261009` | Session 的 Task record；Registry 提供执行定义 | Harness.open 绑定 Storage/Models/Registry；运行句柄可重建 | scheduler 按 checkpoint 推进 | 持久工作有明确恢复记录 | 实验接口与定义兼容、外部效果另有约束 | [Pico5](../agents/pi-durable/architecture.md) |
| DeerFlow，应用；`deerflow-20261009` | RunManager 的 run；图 state 的 thread | Gateway 每 run 构图；Client 配置 key 相同复用 | worker/Client → compiled graph | run、thread、graph instance 分开 | 多 worker 故障和所有扩展实例成员未穷举 | [DeerFlow](../agents/deerflow/architecture.md) |
| Claude，冻结材料；`claude-frozen-documents` | 原稿中的会话层与 query 活运行 | REPL/SDK 入口分别持有状态 | query generator、工具 executor | 只能解释冻结材料里的职责 | 原源码版本未知，不声明当前保证 | [Claude](../agents/claude/architecture.md) |
| Codex，开源 core；`codex-20261009` | Session 的 history/active_turn；RolloutRecorder 历史 | manager spawn/load Thread；turn 与 step 分别建快照 | submission_loop → SessionTask → run_turn | 长活线程与当次采样配置分开 | 现代 agent runtime 全部 durable 工作未分析 | [Codex](../agents/codex/architecture.md) |
| Hermes，原生路径；`hermes-20261009` | AIAgent 活实例；宿主历史；SessionDB 消息 | CLI 构造；Gateway 条件缓存；turn 局部状态单独建 | run_conversation → native phases | 实例、会话身份、iteration 有不同生命周期 | ACP 与平台投递可靠性尚未完整核验 | [Hermes](../agents/hermes/architecture.md) |
| LangChain，构图框架；`langchain-20261009` | 应用提供运行输入；框架定义 AgentState/schema | create_agent 一次构图，可多次调用 | model/tools/hook 节点与路由 | 统一调用协议和编排构造 | 不替应用拥有全部会话、鉴权、部署 | [LangChain](../frameworks/langchain/architecture.md) |
| LangGraph，执行框架；`langgraph-20261009` | 每次 Loop 的 channels/tasks；checkpointer 保存快照 | compiled graph 复用，调用创建 Loop；thread 按 config 寻址 | tick → runner → after_tick | 图定义、活执行、持久身份分开 | 并发同 thread 与后端耐久需应用约束 | [LangGraph](../frameworks/langgraph/architecture.md) |
| DeepSeek，developer preview；`deepseek-20261009` | AgentLoop 工厂、ReactLoopAgent 驱动、Session 事件 | 插件 scope + 可选存储写句柄；卸载先 abort 再收口 | setup/publish → turn/step | 写权与活资源有显式 owner | JSONL lease 不代表每个自定义后端都有跨进程排他 | [DeepSeek](../agents/deepseek/architecture.md) |

## 同一场景与条件化取舍

用户第二次提交输入时，Pi 与 Codex 可继续长活会话/线程，但会创建新的运行或采样边界；Hermes 的复用取决于宿主；DeerFlow Gateway 可重建图而仍用原 thread，Client 则可复用图。**对象复用不等于会话延续，会话延续也不要求对象复用。**

进程重启后，Pico5 从 Task record 推进；LangGraph 从 checkpoint 与任务 writes 重建图运行；DeepSeek 修复旧未闭合 turn 再继续后续工作。恢复单元与旧函数栈分别判断，不能统一称“恢复 session”。

如果只需要交互历史重建，应先明确哪些状态必须跨进程保存；需要进行中工作恢复时，再选择显式工作记录或图 checkpoint。它们增加定义版本、状态兼容和恢复策略治理。这里是基于机制的静态取舍，没有测量构造开销、吞吐或成熟度；历史 Claude 不作为当前选型保证。

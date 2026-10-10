---
id: "comparison-matrix"
title: "对象矩阵：同一问题与不同阶段"
subject: "comparison"
status: "index"
baselines: ["pi-20261009", "deerflow-20261009", "codex-20261009", "hermes-20261009", "langchain-20261009", "langgraph-20261009", "deepseek-20261009", "claude-frozen-documents"]
sources: []
depends_on: ["pi-architecture", "durable-architecture", "deerflow-migrated", "claude-migrated", "codex-plan", "hermes-migrated", "langchain-migrated", "langgraph-migrated", "deepseek-plan"]
evidence: ["source", "historical-document", "static-inference"]
verified_scope: "已比较层次、驱动器和代表主链路；全部配置、产品界面和部署可靠性未逐项验证。"
---

# 对象矩阵：同一问题与不同阶段

当前九个对象都已有分层正文，覆盖深度并不相同。下表先区分“控制模型/工具循环的层”和“装配或执行它的层”，避免把应用与框架重复统计成独立方案。

| 对象 / 阶段 | 输入与组合根 | 循环驱动 / 所在层 | 状态与扩展的特色 | 宿主/部署边界 | 证据 |
|---|---|---|---|---|---|
| Pi AgentSession，正式默认 | CLI/SDK → services/session | AgentSession 编排；Agent loop 执行 | 历史树、扩展事件与会话运行绑定 | 本地进程；其他接入未穷举 | [默认分册](../agents/pi/index.md) |
| Pico5，实验 | durable TUI/Worker → Harness.open | TaskScheduler / generation-tool Task | Session 统一提交 entries/tasks/documents | 实验服务接入，未达到完整旧接口等价 | [实验分册](../agents/pi-durable/index.md) |
| DeerFlow，应用 | Gateway worker 或嵌入 Client | LangChain 构图，LangGraph 执行 | 产品 middleware、thread/run 与平台存储 | Gateway 与 Client 生命周期不同 | [应用分册](../agents/deerflow/index.md) |
| Claude，冻结历史 | 材料中的 CLI → REPL/SDK | query async generator | deferred tools、权限、分层上下文 | 精确源码快照未知；不推定当前部署 | [冻结分册](../agents/claude/index.md) |
| Codex，开源 core | 宿主 → ThreadManager/SessionIo | SessionTask → run_turn → sampling/tools | Turn/Step 快照、rollout writer、执行审批 | 开源 core；桌面私有宿主未分析 | [core 分册](../agents/codex/index.md) |
| Hermes，应用 | CLI/Gateway → AIAgent | conversation_loop 的阶段编排 | transport、工具分段与消息批次 | codex_app_server 可整轮转交；ACP 另管 turn 排队与反馈 | [应用分册](../agents/hermes/index.md) |
| LangChain，框架 | create_agent(model/tools/middleware) | 生成 model/tools/hook 节点与路由 | Runnable/Message/Tool 协议，request override | 由应用宿主调用，不是部署服务本身 | [构图分册](../frameworks/langchain/index.md) |
| LangGraph，框架 | StateGraph.compile / Pregel 调用 | 每次调用的 Loop + runner | channel/reducer、超步、checkpoint、interrupt | 后端和运行配置由应用提供 | [运行分册](../frameworks/langgraph/index.md) |
| DeepSeek，developer preview | profile patches → Cordis 插件树 | AgentLoop → ReactLoopAgent turn/step | Session 事件/surface、句柄写权与 flush | 后端与插件取决于 profile；跨语言仅文档定位 | [Harness 分册](../agents/deepseek/index.md) |

共同字段仍固定为入口、组合根、状态 owner、loop driver、持久单元、context 投影、授权、扩展、子 Agent、并发、取消、恢复、事件与部署。本版完整主链路静态覆盖不等于各字段已经穷尽：尤其全部部署、各 provider 的摘要质量与每种平台权限没有统一实测。

同一任务“用户让 Agent 修改文件”可以经过应用再到框架：DeerFlow 的产品 policy 决定允许什么，LangChain 生成控制节点，LangGraph 调度节点，工具 handler 才修改文件。比较时只将各层自己的决定归给它，不能把实际文件权限归给图调度器。

取舍应从需求进入：交互会话、可恢复工作、可插拔运行组合和多节点图是不同约束。九个对象的具体基线由证据页 frontmatter 引用，完整 SHA 见[基线登记](../guide/baselines.md)。DeerFlow 锁定包与两框架主干的版本组合分开记录。

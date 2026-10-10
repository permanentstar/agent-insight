---
id: "comparison-observability"
title: "比较：观测、终态与交付确认"
subject: "comparison"
status: "index"
baselines: ["pi-20261009", "deerflow-20261009", "codex-20261009", "hermes-20261009", "langchain-20261009", "langgraph-20261009", "deepseek-20261009", "claude-frozen-documents"]
sources: ["comparison-legacy"]
depends_on: ["pi-loop", "pi-platform", "durable-documents", "deerflow-runtime", "claude-capabilities", "claude-practices", "codex-plan", "hermes-capabilities", "langchain-observability", "langgraph-migrated", "deepseek-plan"]
evidence: ["source", "historical-document", "static-inference", "proposal"]
verified_scope: "九对象固定基线的静态机制比较；Claude 是冻结转述，候选设计明确标注；未做运行或性能测量。"
---

# 比较：观测、终态与交付确认

观测树解释调用归属，持久记录解释可恢复事实，交付确认解释接收方结果。三者分开核验，才能避免“UI 已看到”“模型说完成”或“trace 正常”被当成业务成功。

![调用与效果分别产生临时进度、持久事实和 trace；业务验收消费真实结果，外部投递及 ACK 再确认交付，各层不可代证](../assets/comparison-observability.svg)

| 对象与阶段 | 权威状态 owner | 构造与生命周期 | 实际机制与执行点 | 能保证什么 | 不能保证/未核验 | 证据页 |
|---|---|---|---|---|---|---|
| AgentSession，默认；pi-20261009 | Agent events、SessionManager、TUI | 运行时事件先消费，历史另 append | stream → UI/hooks；session entry 保存 | 事件和历史职责可追 | 展示事件不保证写入确认或任务验收 | [循环](../agents/pi/loop.md)、[TUI](../agents/pi/platform.md) |
| Pico5，实验；pi-20261009 | Task/Session committed state | commit 后进度发布；观察句柄可释放 | DocumentState → Chord snapshot/update | 观察已采用状态，不暴露事务 draft | 不自动证明外部 effect 恰好一次或远端 ACK | [视图](../agents/pi-durable/documents.md) |
| DeerFlow，应用；deerflow-20261009 | RunStore、ThreadEventStore、graph checkpoint | worker 持 owner lease；事件 store 单独写 | seq paging/read-after → store replay；finalize 复核资格 | 数据分页可重读，终态写受 owner 约束 | event batch 是 best effort；重读不续跑模型；业务 ACK 未统一 | [Run/事件](../agents/deerflow/runtime.md) |
| Claude，冻结；claude-frozen-documents | transcript/UI、Bridge、managed session/events | 不同历史材料作用范围分开 | query/tool 反馈、远程 Bridge/事件实践 | 能解释历史 transport/会话/UI 分层 | 私有 gates、版本、交付路径缺证据，不推当前能力 | [能力](../agents/claude/capabilities.md)、[实践](../agents/claude/practices.md) |
| Codex，core；codex-20261009 | event sink、RolloutRecorder、Thread | writer 异步排队，flush/persist 单独 ack | AddItems 与持久 writer request 分开 | 可区分发布事件、排队和确认 | writer ack 不证明外部工具业务成功 | [架构](../agents/codex/architecture.md)、[上下文](../agents/codex/context-capabilities.md) |
| Hermes，原生；hermes-20261009 | SessionDB、平台 callback、cron claim | 消息批次提交成功才置 marker；cron 持 claim | ACP chunks + session append；cron side_effect_fence → delivery | 平台输出与数据库/cron owner 分开解释 | 并非所有平台 ACK 或重启失败场景已测 | [持久层](../agents/hermes/architecture.md)、[cron](../agents/hermes/capabilities.md) |
| LangChain，构图；langchain-20261009 | callbacks/tracer run map | config 传回调与 parent；tracing 自动/手工配置 | _configure → manager → BaseTracer._start_trace | parent、trace_id、dotted_order 的归属链可追 | trace 缺父可能成为根；追踪不提供效果事务 | [tracing](../frameworks/langchain/observability.md) |
| LangGraph，执行；langgraph-20261009 | stream events、channels、saver | loop 超步推进与 saver 持久模式分开 | messages/updates stream、pending writes/checkpoint | 图运行资料与流视图可分开 | stream 结束不是业务验收或外部投递 ACK | [checkpoint](../frameworks/langgraph/architecture.md) |
| DeepSeek，preview；deepseek-20261009 | Session seq、活动 step 与 storage handle | progress 临时；ordered append；flush 屏障 | session events / repair / checkpoint policy | 未闭合工具结果具名未知，持久屏障可失败阻断 | closed turn 可含未知/中断，不能全部称成功 | [事件](../agents/deepseek/architecture.md)、[压缩](../agents/deepseek/context.md) |

## 同一故障：工具写入成功，回复发送失败

| 可观察事实 | 能得出的判断 | 还缺什么 |
|---|---|---|
| trace/模型生成最终回答 | 生成路径走到某位置 | 实际工具结果、错误分支、业务验证 |
| 工具返回成功并可读回 | 具体写入已生效，条件以工具契约为准 | 回复投递情况 |
| turn/run terminal | 运行所有者核销了本次工作 | terminal 可是 failed/cancelled；需核对状态与结果 |
| 消息 storage confirmed | 本地记录可按当前后端契约恢复 | 外部接收端是否收到 |
| 外部接口接受/ACK | 一次投递被接口接受或确认 | 与业务要求相符的 ACK 定义，可能仍需回读 |

旧原稿建议在产品层设置 Completion Validator 与 Delivery/ACK，保留为**候选设计**。可复用要求是保存验收证据和投递身份；不是强制新增两个服务，也不宣称所有九对象已有统一实现。真实网络重试须依接口幂等/查询契约，trace 和模型语义不能提供幂等。

## 条件化取舍与未知

开发诊断适合 callback/run tree；产品会话审计需要稳定身份与事件/历史；重启续跑需工作状态；跨渠道交付还要投递记录与确认。选择时先确定要证明哪一个结果，再配置观察点。LangSmith、Langfuse、OpenTelemetry 等名称属于不同后端/集成，不以接入数量排名。

本版追到代表 source 的 append/commit/flush/owner 点，没有实际执行目标平台、模型或网络故障。时间、吞吐和成功率没有样本；“可追踪”不得改写成“已实测可靠”。

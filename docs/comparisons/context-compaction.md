---
id: "comparison-context"
title: "比较：Prompt、压缩与长期记忆"
subject: "comparison"
status: "index"
baselines: ["pi-20261009", "deerflow-20261009", "codex-20261009", "hermes-20261009", "langchain-20261009", "langgraph-20261009", "deepseek-20261009", "claude-frozen-documents"]
sources: []
depends_on: ["pi-context", "durable-documents", "deerflow-context", "claude-context", "codex-context", "hermes-context", "langchain-retrieval", "langgraph-advanced", "deepseek-context"]
evidence: ["source", "historical-document", "static-inference", "proposal"]
verified_scope: "九对象固定基线的静态机制比较；Claude 是冻结转述，候选设计明确标注；未做运行或性能测量。"
---

# 比较：Prompt、压缩与长期记忆

上下文预算应先区分持久原始历史、发送给模型的投影和独立长期记忆。压缩摘要是否生效，取决于覆盖范围与提交 owner；模型返回摘要只是中间状态。

![历史、规则和记忆共同形成模型视图；摘要先保存候选及覆盖范围，经 owner 和边界检查提交后才影响后续投影，审计历史可以保留](../assets/comparison-context.svg)

| 对象与阶段 | 权威状态 owner | 构造与生命周期 | 实际机制与执行点 | 能保证什么 | 不能保证/未核验 | 证据页 |
|---|---|---|---|---|---|---|
| AgentSession，默认；pi-20261009 | SessionManager 历史树；Agent 请求消息 | 沿 parent 链构造分支上下文 | CompactionEntry / context edit 参与 buildSessionContext | 逻辑覆盖与物理 append 顺序可分开解释 | 不按日志最后一行推定覆盖；不把候选 async 设计当默认 | [历史](../agents/pi/context.md) |
| Pico5，实验；pi-20261009 | Entry/Task/Document + admission | CompactionTask 持久阶段，摘要调用在事务外 | generation-owned 直接 commit；conversation-owned 写 submission | 活跃边界投放或 stale 核销，观察只见已提交状态 | 存储与复杂交错未实测；实验服务缺口保留 | [摘要](../agents/pi-durable/documents.md) |
| DeerFlow，应用；deerflow-20261009 | ThreadState/checkpointer，长期 memory 单独 | DurableContext 捕获持久事实；request override 临时重投影 | summary middleware；手工 reserve_checkpoint_write → Overwrite messages | 手工操作与 Run 竞争有产品 reservation；source/role 分层 | XML/标签不是隔离；依赖组合/摘要质量未运行 | [Prompt/压缩](../agents/deerflow/context-prompt.md) |
| Claude，冻结；claude-frozen-documents | transcript、请求预算、session/长期 memory | 预算/minor reduction/正式摘要按触发点分层 | cached microcompact 与本地历史修改不同 | 旧材料概念与作用范围可区分 | snip/collapse 细节缺实现；不可补成当前事实 | [压缩/记忆](../agents/claude/context.md) |
| Codex，core；codex-20261009 | ContextManager、WorldState、rollout | local/remote 各构 replacement history | replace_compacted_history + compact metadata + usage | 当前 initial context/WorldState 重建，不只拼 summary | feature gate/远端质量未知；record 与 flush 分开 | [上下文](../agents/codex/context-capabilities.md) |
| Hermes，原生；hermes-20261009 | SessionDB/AIAgent，MemoryManager providers | 快照形成 candidate，turn/attempt/fence 管采用 | begin_commit → in-place/rotate DB → finish boundary | 取消后迟到 worker 不取得新提交资格；必需 checkpoint 有失败边界 | fence 不回滚已在执行的提交；所有 provider 未测 | [提交许可](../agents/hermes/context.md) |
| LangChain，构图；langchain-20261009 | 应用 messages/checkpointer/store | middleware 决定 state mutation 或 request override | Agent hooks、Retrieval/Tool 等组件组合 | RAG、知识、临时请求与持久 state 可以分开 | 框架不自动保证检索质量或长期记忆正确 | [协议](../frameworks/langchain/components.md)、[检索](../frameworks/langchain/retrieval.md) |
| LangGraph，执行；langgraph-20261009 | channels/checkpoint/pending writes | reducers 由 schema 绑定；saver 保历史 | add_messages、Overwrite、Delta 重建 | 更新/覆盖规则明确，snapshot 与祖先 writes 有职责 | Overwrite 非跨 worker 锁；Delta 后端要求不能省略 | [通道](../frameworks/langgraph/advanced.md) |
| DeepSeek，preview；deepseek-20261009 | event log、surface、CompactionEngine | manual idle maintenance；auto pre-step | start → summarize → assertStable → summary + surfaceOp → end → flush | 审计与模型可见区间分离，选中覆盖需稳定 | append/flush 不提供任意外部事务回滚；provider 未全测 | [surface](../agents/deepseek/context.md) |

## 同一故障：后台摘要生成期间，前台追加新消息

| 判断顺序 | 应核验的字段/行为 | 对应机制 |
|---|---|---|
| 摘要覆盖什么 | 分支祖先、水位/选中区间/原快照 | Pi parent 链、Pico5 head、DeepSeek surface seq |
| 谁能写入 | 当前 owner/generation、宿主资格、操作预约 | Pico5 admission、Hermes fence、DeerFlow reservation |
| 何时采用 | 前台运行边界或稳定检查后的 commit | durable write submission、selected-span assertStable |
| 新消息如何保留 | 摘要覆盖之外的 delta 再投影 | 不能按 JSONL 时间或 append 尾部裁剪 |
| 观察何时成功 | 内存采用、复制发布与存储确认 | DocumentState、checkpoint、rollout/flush 分开 |

这张表是检查顺序，不声明每个对象实现同一种后台算法。Claude 历史摘要和 Codex feature 分支仍按各自资料描述；不把另一个系统的 parent 链规则迁成它们的现状。

## 条件化取舍

审计需求强时，保留原事件并改变 model surface 更容易追溯；历史树适合分支上下文重建；工作需跨中断推进时，持久 Task/图 checkpoint 还需保存控制状态。长期记忆用于跨会话资料，摘要用于预算，两者写入频率、权限和错误修复范围不同。

缓存稳定性、摘要质量、检索召回和磁盘大小是不同指标。XML 标签只改善资料边界可读性；System 角色、数据可信度与工具授权另行控制。本版没有同负载 token/缓存/准确率测量，不能给一个跨对象“压缩最好”结论。

---
id: "comparison-state"
title: "比较：上下文、持久化与恢复"
subject: "comparison"
status: "index"
baselines: ["pi-20261009", "deerflow-20261009", "codex-20261009", "hermes-20261009", "langchain-20261009", "langgraph-20261009", "deepseek-20261009", "claude-frozen-documents"]
sources: []
depends_on: ["pi-architecture", "durable-architecture", "deerflow-migrated", "claude-migrated", "codex-plan", "hermes-migrated", "langchain-migrated", "langgraph-migrated", "deepseek-plan", "pi-context", "claude-context"]
evidence: ["source", "historical-document", "static-inference"]
verified_scope: "比较历史、工作、效果三个层次及代表提交点；所有对象均未运行崩溃注入或性能测试。"
---

# 比较：上下文、持久化与恢复

“恢复”至少要指定三个对象：消息历史、进行中的工作、外部效果。保存第一层不自动提供第二层；把第二层做成事务，也不能自动使第三层恰好执行一次。上下文则是发送给模型的投影，可能与保存的历史不同。

![比较恢复的三个对象：历史重建模型视图、工作记录决定后续推进、外部效果需要幂等或核对；三者不能互相替代](../assets/comparison-recovery.svg)

| 对象与阶段 | 权威状态 owner | 构造与生命周期 | 实际机制与执行点 | 能保证什么 | 不能保证/未核验 | 证据页 |
|---|---|---|---|---|---|---|
| AgentSession，官方默认；`pi-20261009` | SessionManager 历史树 / Agent 消息 | 重建分支 parent 链及模型投影；活动执行在内存 | compaction/context edit 后构造输入；事件与 append 先后分开 | 分支历史与请求上下文关系可追 | 未证明任意活工具跨崩溃续跑或 fsync | [Pi](../agents/pi/architecture.md) |
| Pico5，实验；`pi-20261009` | Session entries/tasks/documents | Storage 恢复 Task checkpoint，Registry 供当前代码 | commit 后发布进度；tool intent/outcome 分开 | 显式工作恢复点与重放政策 | safe 条件与后端配置限制；外部效果非恰好一次 | [Pico5](../agents/pi-durable/architecture.md) |
| DeerFlow，应用；`deerflow-20261009` | ThreadState/checkpointer；RunStore/event store | 图可重建，按 thread 寻址；run 终态另存 | graph stream + checkpoint；产品上下文/摘要另处理 | 各存储的职责与身份可区分 | app 锁定组合未做崩溃验证；完整压缩未核验 | [DeerFlow](../agents/deerflow/architecture.md) |
| Claude，冻结材料；`claude-frozen-documents` | 材料中的 transcript、请求视图与 memory | 会话恢复与 compact 重建；后台记忆分作用域 | budget/microcompact/collapse/正式摘要分层 | 历史概念可以区分 | snip/collapse 缺实现；原 SHA 未知，无当前保证 | [Claude](../agents/claude/architecture.md) |
| Codex，开源 core；`codex-20261009` | ContextManager history；RolloutRecorder | InitialHistory 重建；AddItems 与 writer ack 分开 | 内存 history 更新 → 入队；flush/persist 等待确认 | 排队与确认是不同契约 | 完整 compaction 覆盖、耐久性与 durable 工作未穷举 | [Codex](../agents/codex/architecture.md) |
| Hermes，原生路径；`hermes-20261009` | SessionDB 消息；Agent 当前请求；memory | 宿主加载历史；DB 批次成功后置成功标记 | append_messages_batch；失败 turn 可另补边界 | 消息批次失败不会写成功标记 | 完整压缩 fence/lineage 未验证；不是工具事务 | [Hermes](../agents/hermes/architecture.md) |
| LangChain，构图框架；`langchain-20261009` | AgentState/messages；应用 checkpointer/store | 框架构图后由 LangGraph 执行与恢复 | request.override 与 state 更新分开 | 模型请求视图不自动等同持久 state | 构图框架自身不提供全套耐久保证 | [LangChain](../frameworks/langchain/architecture.md) |
| LangGraph，执行框架；`langgraph-20261009` | channels/checkpoint + pending writes | 每次 Loop 装载恢复点；interrupt 重跑节点 | 超步合并，sync 等待提交；按 task 取 resume 值 | 有后端及配置时保存图运行恢复资料 | interrupt 前效果可重复；后端及 async/exit 边界不同 | [LangGraph](../frameworks/langgraph/architecture.md) |
| DeepSeek，developer preview；`deepseek-20261009` | Session 的事件/surface；persistence handle | 有序 append；flush 是耐久屏障；恢复先修复日志 | 模型/顶层工具效果前 policy flush；repair 补终态 | 区分未开始和结果未知的工具记录 | repair 关闭旧 turn，非程序续跑；全部压缩未核验 | [DeepSeek](../agents/deepseek/architecture.md) |

## 同一故障：外部写入成功，结果尚未耐久

| 机制 | 遇到这一故障时可解释什么 | 应用仍须决定什么 |
|---|---|---|
| Pico5 tool intent | phase=execute 的记录可恢复；旧与当前 replay 均 safe 才重跑，否则 interrupted | safe 的定义是否覆盖真实效果；是否能查外部结果 |
| DeepSeek 修复 | 已有 tool/call 无 result 记录为 TOOL_OUTCOME_UNKNOWN；关闭旧 turn | 向外部系统核对，或明确接受风险后发新工作 |
| LangGraph checkpoint | 已保存状态/writes 可重建；节点可能再次执行 | 幂等键，拆分效果点，interrupt 前动作能否重复 |
| Pi/Codex/Hermes 的已读消息路径 | 历史与结果可能处于保存/排队中的不同边界 | 未补证前不能断言活工具恢复或统一重放 |
| Claude 冻结材料 | 描述会话与上下文恢复，不足以覆盖该故障 | 不拿历史描述当当前效果保证 |

## 条件化取舍与比较限制

需要延续同一工作状态时，Pico5 的 Task 和 LangGraph 的节点/超步恢复更直接；需要保留中断事实并启动后续工作时，DeepSeek 的 repair 明确区分未开始与未知结果。这是语义差异，不是可靠性排名。三者都要额外处理外部副作用与后端耐久性。

上下文成本比较先统一度量：本地历史、发送消息、provider 有效上下文、后台摘要和长期 memory 是不同对象。Claude 的 cached microcompact 在历史材料中不改本地消息；Pi 用历史树投影；DeepSeek 用 surface；Codex 有 ContextManager；DeerFlow/Hermes 的完整压缩算法仍未核验。本版不把这些路径折成一个“压缩率”或按物理日志时间推定逻辑覆盖。

---
id: "pi-context"
title: "AgentSession：历史树与模型上下文"
subject: "pi-session"
status: "verified-source"
baselines: ["pi-20261009"]
sources: ["pi-session"]
depends_on: ["pi-architecture"]
evidence: ["source"]
verified_scope: "历史路径、压缩投影与 message_end 写入顺序静态核验；未验证崩溃恢复运行。"
---

# AgentSession：历史树与模型上下文

历史存储、当前分支和模型请求上下文是三个不同概念。SessionManager 保存 append-only 条目树；请求上下文沿 leaf 的 parent 链重建，并应用压缩与 context edit。

![AgentSession 管理事件，SessionManager 保存历史树并投影模型上下文](../../assets/pi-session.svg)

| 概念 | 权威内容 | 不能混称 |
|---|---|---|
| 全部 session entries | 包含不同分支及历史压缩条目 | 当前模型全部可见消息 |
| 当前 parent 路径 | 当前 leaf 到 root 的逻辑祖先链 | 文件物理写入顺序 |
| buildContextEntries | 最近相关 compaction、保留区间与后续条目 | 触发压缩的策略 |
| buildSessionProjection / context | context edit 后映射成模型消息 | 原始历史被重写 |

`buildContextEntries` 先建立当前路径，找到这条路径上的最新 compaction，以摘要、firstKeptEntryId 起的保留段和其后条目形成视图；更老 system entries 与压缩条目按实现规则处理。投影再应用 context_edit 的替换/移除并形成模型消息。应按逻辑覆盖边界推导，不能用 JSONL 写入时间排序替代祖先关系。

持久化也与流展示分开：AgentSession 的 `_handleAgentEvent` 在 message_end 上处理 extension、向监听者 emit，随后对 user/assistant/toolResult 等调用 SessionManager.appendMessage。因此它并不提供 Pico5 的“所有可见进度必先持久化”契约；不能据有 session 文件就推定展示之前落库。

证据：[路径与上下文投影](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/session-manager.ts#L476)、[message_end 持久化](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session.ts#L1103)。进程崩溃时正在执行的工具是否造成外部效果，不能仅由保存的最终消息判断。

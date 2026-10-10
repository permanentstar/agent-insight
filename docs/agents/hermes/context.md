---
id: "hermes-context"
title: "Hermes：记忆、压缩与提交许可"
subject: "hermes"
status: "verified-source"
baselines: ["hermes-20261009"]
sources: ["hermes"]
depends_on: ["hermes-migrated"]
evidence: ["source"]
verified_scope: "核验 memory provider 调用、CompressionCommitFence 与候选提交主线；未验证所有 provider 或崩溃/超时组合。"
---

# Hermes：记忆、压缩与提交许可

Hermes 把“形成摘要”和“允许修改当前会话”分开。背景压缩可继续计算，但宿主取消/超时后必须失去提交资格；记忆则是独立的长期资料面，不能和压缩摘要、平台会话 ID 混为一体。

![宿主读取会话快照，后台压缩形成候选，提交 fence 检查后进入数据库压缩或会话轮换，再采用结果；取消阻止未来提交](../../assets/hermes-context.svg)

| 概念 | 所属层 | owner 与消费者 | 生命周期 / 权威范围 |
|---|---|---|---|
| 原始消息 / SessionDB | 会话存储 | AIAgent 与宿主共享会话身份 | 数据库行及 active/归档状态是持久事实 |
| ContextCompressor | 上下文算法 | AIAgent 持有，压缩 worker 使用 | 形成摘要、保护尾部、处理预算；不是持久事务 |
| 压缩候选 / attempt | 背景工作 | worker 使用受控快照与 generation | 未提交结果可以丢弃；不是已生效 state |
| CompressionCommitFence | 提交控制 | 宿主撤销，worker 在提交前认领 | 线程同步与取消资格，防迟到结果修改会话 |
| MemoryManager | 外部记忆编排 | AIAgent 调 provider hooks | turn start、上下文预取、sync、压缩前检查点；provider 各自持久化 |
| 内置 memory / Skills | 长期资料与操作知识 | memory/skills 工具维护，prompt builder 展示 | 不等同本轮对话历史 |

## 记忆进入模型的两条路径

固定身份/内置记忆/用户画像/Skill 索引/项目上下文由 prompt builder 构造。MemoryManager 对外部 provider 派发 turn-start 与上下文 hooks，API 调用前的临时上下文按专用边界包裹并附到请求副本。它不应因此被当作新用户指令或永久 system 规则。

provider 生命周期包括会话切换、回合同步、记忆工具桥接及 pre-compress。`on_pre_compress(require_checkpoint=True)` 要求有声明相应版本且实际成功的 checkpoint provider，否则异常传出、保留未压缩历史。普通 provider hook 的容错与这个必需检查点分支不同；不能一概说“记忆失败都忽略”。证据：[MemoryManager](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/agent/memory_manager.py#L731)、[压缩前 checkpoint 契约](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/agent/memory_manager.py#L807)、[Prompt 资料构造](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/agent/prompt_builder.py)。

## 压缩主链路

`compress_context` 接受消息/system prompt 与可选 commit_fence：先处理 gates、锁与 attempt，再产生 compressed 候选；候选不合格或快照失效则拒绝。即使候选已经生成，仍须 `begin_commit` 允许，随后保护最近回复/用户锚点、折叠 todo、重建 prompt，进入 `_commit_compaction`，最后 `_finish_compaction_boundary` 发布采用结果。

| 状态/条件 | 提交动作 | 失败结果与边界 |
|---|---|---|
| 背景生成中，宿主取消 | 撤销未来提交许可 | 迟到 worker 返回候选不代表可以写回 |
| begin_commit 未通过 | 恢复压缩器与输入快照 | reason=commit_fence_cancelled；会话不 split |
| 已进入提交 | fence 标记 in-flight，finish_commit 结束 | 宿主撤销不能声称已经回滚正在进行的事务 |
| in-place | 同 ID soft-archive 旧 rows 并原子插入 compressed | 旧内容仍可搜索；不是物理删除全部历史 |
| rotated | 建立压缩后的子会话与 parent 关系 | 宿主需采用新 internal session_id；稳定外部 ACP handle 可不变 |
| Codex app-server 路由 | 调 Codex 所有线程的原生 compact | Hermes 本地 transcript 不重写，避免压了错误 owner |

压缩锁、turn lease、attempt generation、commit fence 分别控制持久竞争、当前宿主、旧 worker 和迟到提交，不能用一个“加锁”概念替代。holder-qualified 释放防止旧 worker 删除新锁；内存 append 的 persisted markers 只在数据库成功后采用。[fence](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/agent/conversation_compression.py#L451)、[实际提交许可与采用](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/agent/conversation_compression.py#L4200)、[数据库边界](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/agent/conversation_compression.py#L3688)、[Codex 路由](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/agent/conversation_compression.py#L4314)、[会话批量写入](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/agent/session_persistence.py#L290)。

压缩中段与保留两端只说明摘要算法。完整的压缩契约还包括候选覆盖范围、提交资格、数据库更新和宿主采用：fence 防止迟到工作取得新的提交许可，持久事务与外部记忆 provider 的保证仍需分别判断。
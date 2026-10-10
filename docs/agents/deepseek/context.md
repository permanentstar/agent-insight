---
id: "deepseek-context"
title: "DeepSeek Harness：surface 压缩与持久屏障"
subject: "deepseek"
status: "verified-source"
baselines: ["deepseek-20261009"]
sources: []
depends_on: ["deepseek-plan", "deepseek-capabilities"]
evidence: ["source"]
verified_scope: "核验 compactNow、selected-span 稳定检查与实际 surfaceOp 写入；未验证所有压缩 provider 或文件持久耐久性。"
---

# DeepSeek Harness：surface 压缩与持久屏障

DeepSeek 的会话日志和 model surface 分开：压缩保留审计事件，同时用一条带 surfaceOp 的消息替换模型可见区间。日志 append、surface 生效和 storage flush 是三个不同动作。

![选择 surface 区间，记录 compaction/start，事务外生成摘要，稳定检查后 append summary 和替换消息，end 后 flush；原审计日志保留](../../assets/deepseek-context.svg)

| 概念 | 层次 / owner | 生命周期与消费者 |
|---|---|---|
| Session event log / seq | 会话事实 | 完整事件，包括 log-only 控制/审计 |
| surface | 模型投影 | 消息生产事件及 surfaceOp 重建，不是所有 event 的直读 |
| compaction/start / end | 生命周期记录 | 防并发压缩与恢复时识别未完成尝试 |
| compaction/summary | 审计/来源 | 摘要、shadowed seqs、token/usage，自己不改 surface |
| user/message + surfaceOp | 投影变更 | summary checkpoint message 替换指定 startSeq/endSeq 区间 |
| flush | storage 屏障 | 确认已排队保存；不撤销外部模型/工具效果 |

## 手工压缩主链路

CompactionEngine 是可选能力，Basic provider 的 compactNow 进入 Agent.runMaintenance，要求 idle 且没有 waking queued work；选择可用区间，组合 Agent 与命令 signal，调用 compactSurfaceRegion，传 selected-span 稳定契约与 sessions.flush。忙时抛 ManualCompactionError(busy)，不是往活跃模型流里随时插摘要。

region 检查没有未关闭压缩及自动/手工 turn owner，追加 start；prepare/summarize 在事务外调用模型；结束前 assertStable，保证所选 surface 仍符合原快照。提交体追加 summary，再追加 checkpoint user/message(surfaceOp replace, sourceEventSeqs)，随后 end 关闭生命周期。失败按 summary/commit/persistence 等阶段归因并尽力关闭 end；append 不等同外部事务原子回滚。

证据：[手工 idle 边界与 flush](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/compaction/compaction-basic/src/index.ts#L383)、[start、稳定核验与关闭](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/compaction/compaction-basic/src/region.ts#L193)、[真正 surface 写入](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/compaction/compaction-basic/src/region.ts#L491)。

## 与自动、结果裁剪的区别

自动压缩可在 open turn 的 pre-step 使用 whole-surface 稳定约束；手工可在没有 turn 时维护 selected span。两者必须保持 tool call/result 配对，不能把半个工具交换折叠为摘要。tool-result pruner 与 image offload 是兄弟策略，修改可见结果/媒体的方式不同，不由 compaction-basic 一包概括。

`compaction/*` 事件本身 log-only；UI 与模型由各自投影消费。序号是此会话事件身份，选中覆盖区间依 surface 语义，不能按文件写入时间或任意日志最后一行推断摘要已覆盖所有交错事件。[压缩事件与 checkpoint 类型](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/compaction/compaction/src/types.ts)、[官方 surface 说明](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/compaction.zh.md)。

## 持久性与恢复限制

运行前 checkpoint/flush policy 在模型与顶层工具边界建立屏障（须实际装载对应插件），防持久失败后继续效果。恢复修复未闭合 step/tool/turn，生成 TOOL_NOT_STARTED / TOOL_OUTCOME_UNKNOWN 等结果；不是继续原程序栈或无条件重放工具。

本页覆盖压缩 provider 的代表提交主线，完整存储与 repair 见 [架构章](architecture.md)。模型摘要已经生成但 flush 失败仍是持久失败；最终文字、UI 可见与磁盘确认不能相互替代。无真实重启或 fsync 测量。

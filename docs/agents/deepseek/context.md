---
id: "deepseek-context"
title: "DeepSeek Harness：surface 压缩与持久屏障"
subject: "deepseek"
status: "verified-source"
baselines: ["deepseek-20261009"]
sources: []
depends_on: ["deepseek-plan", "deepseek-capabilities"]
evidence: ["source"]
verified_scope: "核验 Header/SessionEvent 与 surface 关系、compactNow、selected-span 稳定检查与实际 surfaceOp 写入；未验证所有压缩 provider 或文件持久耐久性。"
---

# DeepSeek Harness：surface 压缩与持久屏障

DeepSeek 的会话日志和 model surface 分开：压缩保留审计事件，同时用一条带 surfaceOp 的消息替换模型可见区间。日志 append、surface 生效和 storage flush 是三个不同动作。

![选择 surface 区间，记录 compaction/start，事务外生成摘要，稳定检查后 append summary 和替换消息，end 后 flush；原审计日志保留](../../assets/deepseek-context.svg)


本章沿一次手工压缩走四步：确定可以维护的运行边界与覆盖区间，生成候选摘要，确认区间仍稳定后提交投影变更，最后完成持久屏障，维护收口后再由下一请求采用。概念表先说明各份记录的消费者；随后只沿这条正常路径展开，自动压缩和结果裁剪放在后面比较。

| 概念 | 层次 / owner | 生命周期与消费者 |
|---|---|---|
| Session event log / seq | 会话事实 | 完整事件，包括 log-only 控制/审计 |
| surface | 模型投影 | 消息生产事件及 surfaceOp 重建，不是所有 event 的直读 |
| compaction/start / end | 生命周期记录 | 防并发压缩与恢复时识别未完成尝试 |
| compaction/summary | 审计/来源 | 摘要、shadowed seqs、token/usage，自己不改 surface |
| user/message + surfaceOp | 投影变更 | summary checkpoint message 替换指定 startSeq/endSeq 区间 |
| flush | storage 屏障 | 确认已排队保存；不撤销外部模型/工具效果 |

## 压缩之前：事件结构怎样组成 surface {#storage-model}

![DeepSeek 的 SessionHeader 在对话事件之外保存身份；SessionEvent 以 seq 标识并用 type 决定 data 形状，只有消息类事件带 surfaceOp；sourceEventSeqs 追溯来源，replace 改变模型 surface，原事件日志仍保留](../../assets/deepseek-storage-model.svg)

Session 有三种相关但不同的资料：存储元数据 SessionHeader、有序 SessionEvent，以及由事件重建的 surface。Header 的 `id/parentSession` 等字段描述会话身份和来历；事件的 `seq` 是会话内递增身份，`time` 是毫秒时间，`type` 决定 `data` 的结构。turn/step 起止、request/header、工具和压缩记录并不拥有同一种 data；消息生产事件还声明 `surfaceOp`，可用 `sourceEventSeqs` 指回较早来源。[Header 与事件结构](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/core/session/src/types.ts#L92)、[surface 事件与操作](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/core/session/src/types.ts#L435)。

### 样例：新追加的事件为何出现在旧区间的位置

下面用教学 seq 表示一次完整工具交换后的压缩；seq 间的控制事件省略。工具调用与结果已经闭合，原 surface 依次有 seq=2、5、8、12 四个消息节点：

| 事件 seq | 类型／字段节选 | 保存及投影用途 |
|---|---|---|
| 2、5、8 | 目标、读取动作与结果对应的消息事件，`surfaceOp="append"` | 原 surface 的前段 |
| 12 | 近期消息，`surfaceOp="append"` | 准备保留的近期内容 |
| 20 | `compaction/start` | 仅记录压缩尝试，不成为模型消息 |
| 21 | `compaction/summary`，`shadowedSeqs=[2,5,8]` | 保存摘要与来源，自己不改变 surface |
| 22 | `user/message`，`surfaceOp={op:"replace",startSeq:2,endSeq:8}`，`sourceEventSeqs=[20,21,2,5,8]` | 用承载摘要的消息替换原 surface 区间 |
| 23 | `compaction/end` | 关闭尝试，后面再等待 flush |

这是按逻辑事件整理的字段节选，不是完整 JSONL 文件；摘要 data 和具体消息负载省略。seq=22 写入前，模型视图是 `[2,5,8,12]`；替换采用后是 `[22,12]`。22 虽然后写入，却占据被替换区间的逻辑位置。事件日志仍保留原记录，来源读取沿 sourceEventSeqs 找回；模型请求由 `deriveMessages()` 按新的 surface 顺序生成。[替换约束与事件类型](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/core/session/src/types.ts#L450)。

逻辑 SessionEvent 也不能直接等同于物理文件的全部行：JSONL 后端另有格式与存储元数据处理。`seq` 与文件读取位置 SessionLogOffset 是独立类型，后者不用于替代 surface 的事件身份。[序号、文件位置与格式定义](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/core/session/src/types.ts#L32)。后面四步就沿这份替换关系展开摘要的生成、采用和持久确认。

## 第一步：取得维护边界并选定覆盖区间

CompactionEngine 是可选能力，Basic provider 的 compactNow 进入 Agent.runMaintenance，要求 idle 且没有 waking queued work；选择可用区间，组合 Agent 与命令 signal，调用 compactSurfaceRegion，传 selected-span 稳定契约与 sessions.flush。忙时抛 ManualCompactionError(busy)，不是往活跃模型流里随时插摘要。

## 第二步：生成候选摘要

`compactSurfaceRegion` 检查没有未关闭压缩，并确认自动或手工调用的 turn 归属，然后追加 `compaction/start`。prepare/summarize 在事务外调用模型，输入是选定区间的消息和请求所需的配置；输出先是候选摘要。生成完成后，`assertStable` 确认所选 surface 仍符合原快照，才进入提交。

## 第三步：写入摘要来源并替换模型投影

提交体先追加 `compaction/summary`，保存摘要及被覆盖的来源，再追加承载摘要的 checkpoint 消息。下面是按源码顺序抽出的记录骨架；命令来源、原始模型输出与调用标记、usage 等统计字段省略，变量都来自已选定区间及摘要结果。

```ts
const summaryEvent = session.append('compaction/summary', {
  compactionId: startEvent.data.compactionId,
  summary,
  shadowedRange: { start, end },
  shadowedSeqs: [...shadowedSeqs],
  shadowedTokenCount,
  provider,
  model,
})
session.append('user/message', checkpointMessage, {
  surfaceOp: { op: 'replace', startSeq: start, endSeq: end },
  sourceEventSeqs: [startEvent.seq, summaryEvent.seq, ...shadowedSeqs],
})
```

第一条为审计和来源服务，第二条改变模型可见贡献。`replace` 的对象是选定 surface 区间；原事件仍保留在日志里，新的模型视图以摘要消息代替该区间。随后 `compaction/end` 关闭本次尝试。[查看摘要与 surface 写入的对应关系](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/compaction/compaction-basic/src/region.ts#L491)。

## 第四步：完成 flush，再由下一请求采用

`sessions.flush` 先确认保存边界，手工维护返回并释放 maintenance 后，后续请求才能继续。正常路径是追加 end、等待 flush、返回压缩结果，再结束维护；图与正文使用这一顺序。[查看 end 后的 flush 与返回](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/compaction/compaction-basic/src/region.ts#L253)。

下一次 `buildRequest` 调用 `deriveMessages()`，读取的已经是变更后的 surface。假设之前的消息依次为“修复目标、读取、读取结果、修改、验证结果”，所选前段被摘要覆盖，下一请求便使用“摘要、保留的近期消息”；审计侧仍能查回原步骤。

摘要生成、surface 变更和持久确认解决不同问题：模型怎样理解既往工作、哪些消息进入请求、这些记录是否能跨崩溃存活。失败按 summary/commit/persistence 等阶段归因，并尽力关闭 end；单次 append 不能被解释成外部事务的原子回滚。

## 两条相关支路：自动压缩与结果裁剪

自动压缩可在 open turn 的 pre-step 使用 whole-surface 稳定约束；手工可在没有 turn 时维护 selected span。两者必须保持 tool call/result 配对，不能把半个工具交换折叠为摘要。tool-result pruner 与 image offload 是兄弟策略，修改可见结果/媒体的方式不同，不能由 compaction-basic 统一概括。

`compaction/*` 事件本身 log-only；UI 与模型由各自投影消费。序号是此会话事件身份，选中覆盖区间依 surface 语义，不能按文件写入时间或任意日志最后一行推断摘要已覆盖所有交错事件。[压缩事件与 checkpoint 类型](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/compaction/compaction/src/types.ts)、[官方 surface 说明](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/docs/subsystems/compaction.zh.md)。

## 持久性与恢复限制

运行前 checkpoint/flush policy 在模型与顶层工具边界建立屏障（须实际装载对应插件），防止持久化失败后继续执行相应动作。恢复修复未闭合 step/tool/turn，生成 TOOL_NOT_STARTED / TOOL_OUTCOME_UNKNOWN 等结果；不是继续原程序栈或无条件重放工具。

压缩 provider 决定上下文如何投影，存储后端决定记录何时耐久，repair 决定如何继续未闭合的执行；后两层见 [架构章](architecture.md)。模型摘要已经生成但 flush 失败仍是持久失败；最终文字、UI 可见与磁盘确认不能相互替代。

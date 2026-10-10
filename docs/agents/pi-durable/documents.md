---
id: "durable-documents"
title: "Pico5：Document、上下文投影与异步摘要"
subject: "pi-durable"
status: "verified-source"
baselines: ["pi-20261009"]
sources: []
depends_on: ["durable-architecture", "durable-glossary"]
evidence: ["source"]
verified_scope: "核验 Document 身份/观察与 CompactionTask 提交分支；未执行存储恢复或远端视图测试。"
---

# Pico5：Document、上下文投影与异步摘要

Pico5 的 Document 是 Session 事务管理的可变状态，Entry 是历史贡献，Task 是推进工作；三者可以在一次 commit 中改变，但不能当成一个对象。Chord 的复制视图观察提交结果，不接管存储。

![Entry、Task 与 Document 在 Session 事务中提交，CommittedStateSource 经 Chord 发布视图；摘要任务在允许的会话边界写入](../../assets/pico5-documents.svg)

| 概念 | 所属层 / 构造 | 消费者 | 身份与生命周期 |
|---|---|---|---|
| DocToken / family | schema 声明：defineDoc / defineDocFamily | tx.doc、Session.documentState | kind、scope、owner ID、可选 key 定义地址 |
| Session-scoped Doc | 会话资料 | 多 conversation/task | 不绑定单一模型轮次 |
| Conversation Doc | conversation 状态 | Harness / generation | latest-only 与 rewindable 语义分别声明 |
| Task Doc | 任务私有资料 | 对应 Task | task ID 限定 owner，不能借另一任务地址读写 |
| ContextView | 模型投影 | request、compaction | 从 Entry 贡献与 head 重建，不是 UI 全历史 |
| DocumentState | 提交观察 | 本地服务/远端 Chord consumer | 已提交版本；句柄释放与数据删除不同 |

Document 地址解析检查 owner ID；schema 版本与 stored record 另行校验。`documentState` 在 Session 队列中加载记录、接入 CommittedStateSource，再包成 Chord replicatedState；构造失败 detach。这使观察者只看到采用后的状态，而不是事务中的 Draft。[文档地址](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/documents.ts#L109)、[提交观察句柄](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/session/session.ts#L213)。

## 先定位模型投影，再定位摘要

Generation 消费 ContextView；投影保留工具 call/result 顺序并按 summary head 切分覆盖范围。估算优先用已覆盖该 head 的最新 assistant usage，再追加其后消息估算；没有可用测量时才全部估算。这是请求预算，不是 durable storage 大小。

CompactionTask 状态先 select，再把摘要请求与边界存进 summarize checkpoint；失败可按策略进入 retry。LLM 摘要在事务外生成，usage 与状态随后在 commit 中核销。只接受正常 stop、没有 tool call 且非空的文本摘要；length、tool call、空结果与 error 都有具名失败。

| 摘要 owner | 谁持有执行边界 | 实际放置 |
|---|---|---|
| generation-owned 阻塞摘要 | generation 持有 run 并等待 | 当前 commit 追加 summary |
| conversation-owned 背景摘要 | conversation 仍可能有活跃生成 | write submission 接纳；空闲立即放，忙时边界放或核销为 stale |
| 调用者停止等待 | Task 可能已经接纳 | wait cancellation 不等同取消持久工作 |

忙会话不能由后台 summary 绕过 admission 任意 append，否则覆盖水位与活跃生成会交错。模型请求完成也不能直接宣布压缩已生效。[CompactionTask](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/compaction.ts#L103)、[预算与失败结果](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/compaction.ts#L307)、[两种摘要放置边界](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/compaction.ts#L401)。

## 与旧 Lane / Chord 的对应

旧 Lane 用专用 Operation 状态表达执行与结构操作；Pico5 用通用 Task + typed Doc/Entry。Chord 仍承担 Service 与复制，当前 DocumentState 已直接对接其观察接口；旧“把 Harness event 手工拼 transcript 再 publish”的分析不能原样迁入这里。

Document/fork 是底层能力，产品命令还需接通服务接口。navigation、nextRun、resume、子会话服务和 transcript paging 的缺口见 [架构章](architecture.md)。理解数据模型与产品入口的分层，才能判断某项能力是否能从当前接口使用。
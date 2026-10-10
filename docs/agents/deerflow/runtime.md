---
id: "deerflow-runtime"
title: "DeerFlow：Run 归属、事件读取与独立写入"
subject: "deerflow"
status: "verified-source"
baselines: ["deerflow-20261009"]
sources: ["deerflow-runtime", "deerflow-harness"]
depends_on: ["deerflow-migrated"]
evidence: ["source"]
verified_scope: "核验 run 启动/终态资格、独立操作 reservation 与 event store 游标；未实测多 worker、断网或重放交付。"
---

# DeerFlow：Run 归属、事件读取与独立写入

Gateway 的 RunManager 管执行归属与准入，LangGraph checkpointer 管图状态，event store 管可读取的历史/事件。三个事实源面向不同消费者，不能合成一个“checkpoint 数据库”。

![Gateway 接纳 thread operation 后 worker 认领 Run，图写 checkpoint，事件旁路存储；取消或失去 lease 会限制终态写入](../../assets/deerflow-runtime.svg)

| 概念 | owner / 构造与消费 | 生命周期与权威范围 |
|---|---|---|
| thread | 产品会话，Gateway 解析身份/权限 | 跨多 run 的可恢复状态与元数据 |
| run / RunRecord | RunManager 接纳，worker 执行 | pending/running/terminal、owner、lease、cancel；不等同 graph instance |
| checkpoint | saver，由图 root 调用 | 恢复 channel、任务和节点进度 |
| event store | worker/converter 写，Gateway 分页读 | 可见消息、子任务事件、seq 游标；不驱动图恢复 |
| thread store / artifact | 产品资料 | 标题、权限、产物与历史，不替代 channel reducer |
| reservation | RunManager 非 run 操作 | 独立 checkpoint/artifact/branch/delete 的写入资格 |

## 从 pending 到终态

`try_start` 在 record.start_lock 内先核验 pending/abort，再调用持久 store.start_run，最后重新核验本地取消竞争才采用 running。失败具名为 startup error 或 cancelled，不能继续构图。worker 随后固定 checkpoint mode、context、metadata、工厂参数，再构图并 astream。

heartbeat 模式下 owner lease 续期；丢失归属会设置 ownership_lost 并限制后续持久 run/thread finalization。成功/错误终态用 set_status_if_not_cancelled，让先赢的持久取消优先；store 无法确认取消/完成先后时，标记归属丢失，不凭本地 status 宣布持久成功。

| 竞争/失败 | 控制点 | 结果与不能推出的保证 |
|---|---|---|
| pending 期间取消 | try_start 前后两次核验 | 不创建可继续的运行；start_run 已写后仍协调恢复状态 |
| 同 thread 新工作 | durable admission / operation_kind | 依存储准入和 multitask 策略；进程内锁不足跨 worker |
| lease 丢失 | owner-qualified store 与 manager 状态 | 停止旧 owner 终态写入；已发生工具效果不回滚 |
| 终态与取消同时到达 | finalize_if_not_cancelled | cancellation 可胜出；不重写为无条件 success |
| stream 关闭失败 | cancellation/stream cleanup | 命名并清理；不能把 generator close 当所有外部任务已结束 |

证据：[try_start](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/packages/harness/deerflow/runtime/runs/manager.py#L930)、[终态核销](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/packages/harness/deerflow/runtime/runs/manager.py#L1090)、[worker 执行与收尾](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/packages/harness/deerflow/runtime/runs/worker.py#L891)。

## 事件重读与模型执行是不同恢复

worker 将 graph 输出转为产品事件，event store 以 seq 保存可分页资料。list_messages/list_events 的 after_seq 返回较新的记录，before_seq 可向历史回读；一些端点只允许向后游标，不能给所有 endpoint 一个通用 cursor 参数。`put_if_absent` 允许按身份幂等补终态事件，但不是数据库与模型调用的统一事务。

子 Agent 事件 buffer 的 put_batch 是旁路持久化，错误处理有 best-effort 分支。UI 看到 token、store 读到事件、checkpoint 写完、Run 终态成功是四个观察点；缺一个不能由另一个代证。断线后分页/补读只恢复已保存事件，不能保证重放所有曾被客户端看见的临时 delta。

证据：[事件存储契约](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/packages/harness/deerflow/runtime/events/store/base.py#L46)、[worker 子任务事件 buffer](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/packages/harness/deerflow/runtime/runs/worker.py#L757)、[Gateway 分页接口](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/app/gateway/routers/thread_runs.py#L1633)。本书没有实测 SSE 重连或客户端去重。

## 非 run 写入也需要准入

手工 compact 入口权限检查后，在 reserve_checkpoint_write 中读/压缩/更新 checkpoint。内部 reserve_thread_operation 建立短期 pending row，和普通 run 共享活跃 thread 的持久唯一约束；退出删除 row，删除失败留下具名孤儿协调。reservation 附着调用任务，lease 丢失取消该写入并转成 ConflictError。

这与 Python keyed lock 不同：前者给跨 worker 准入，后者只协调进程局部。非 heartbeat 多 worker 不能因有 reservation 代码就称完全安全；具体 store、部署与故障注入还需测试。

证据：[reservation](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/packages/harness/deerflow/runtime/runs/manager.py#L1865)、[compact 路由保护](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/app/gateway/routers/threads.py#L1506)。嵌入式 Client 直接调用图，没有自动经过 Gateway 的 RunManager；要复用准入应由宿主显式接入。

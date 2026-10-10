---
id: "langgraph-advanced"
title: "LangGraph：合并、子图、Overwrite 与恢复边界"
subject: "langgraph"
status: "verified-source"
baselines: ["langgraph-20261009"]
sources: ["langchain-stage4"]
depends_on: ["langgraph-migrated"]
evidence: ["source"]
verified_scope: "核验通道并发规则、Delta 重建与 Command/interrupt 契约；未执行真实 checkpointer 或外部副作用恢复。"
---

# LangGraph：合并、子图、Overwrite 与恢复边界

StateGraph 的 state 是受 schema 与通道规则约束的共享数据；它不是所有节点任意读写的普通全局字典。超步隔离图内写入，但不会隔离节点内部对数据库、文件或网络的并发副作用。

![同一超步任务读取稳定通道，节点输出先保留为 writes，通道合并后创建 checkpoint，下一超步或恢复继续](../../assets/langgraph.svg)

| 概念 | 所属层 | owner 与输入输出 | 生命周期 |
|---|---|---|---|
| state schema | 建图层 | StateGraph 根据字段构造 channels | 编译后通道决定更新语义，节点 input schema 可限制可见字段 |
| writes | 任务层 | 节点返回 update / Command | 未完成超步时可作 pending writes 保存 |
| reducer | 通道层 | 合并旧值与写入 | 必须明确并发、删除与覆盖语义 |
| checkpoint | saver 层 | channel_values、versions、seen 等 | 恢复图状态；外部 effect 不随之回滚 |
| 子图 | 嵌套执行层 | 独立编译图或在节点内调用图 | 父子可共享兼容字段，也可由适配节点转换，不保证全局可见 |

## 同一字段的并发写

| 通道/操作 | 单步写入规则 | 恢复要求 |
|---|---|---|
| LastValue | 零值不变，一值替换；多值抛 InvalidUpdateError | 不能靠线程完成时间选择最后一方 |
| BinaryOperatorAggregate | 把写入经二元 reducer 合并 | reducer 决定顺序/去重；list add 不自动按消息 ID 更新 |
| add_messages | 按消息 ID 更新、追加及处理 RemoveMessage | 保留 ID，不能用列表尾位置代替逻辑身份 |
| Overwrite | 绕过 reducer 写包装值；同一步多个 Overwrite 拒绝 | 与普通写混合的语义取决于通道实现，不能泛称“最后覆盖” |
| DeltaChannel | reducer 接收一批 writes，checkpoint 常只保留标记 | 需要祖先 writes 与周期 snapshot；属于 beta 契约 |

[LastValue](https://github.com/langchain-ai/langgraph/blob/bfcfea554ed5c7f7be562cebf8825e911b493ab1/libs/langgraph/langgraph/channels/last_value.py#L56)、[聚合与 Overwrite](https://github.com/langchain-ai/langgraph/blob/bfcfea554ed5c7f7be562cebf8825e911b493ab1/libs/langgraph/langgraph/channels/binop.py#L123)、[消息 reducer](https://github.com/langchain-ai/langgraph/blob/bfcfea554ed5c7f7be562cebf8825e911b493ab1/libs/langgraph/langgraph/graph/message.py)、[DeltaChannel](https://github.com/langchain-ai/langgraph/blob/bfcfea554ed5c7f7be562cebf8825e911b493ab1/libs/langgraph/langgraph/channels/delta.py#L25)。

Delta 的 reducer 必须确定且批次合并一致：分批应用和把两批连起来应用要产生同一值。snapshot 由更新计数或总超步计数触发；不能只按“每几步存一次”理解。DeltaChannel.checkpoint 返回 MISSING，实际 snapshot 在 create_checkpoint 时生成，其余恢复依赖 saver 的 get_delta_channel_history。缩小 checkpoint blob 不表示可丢弃祖先 writes。

BinaryOperatorAggregate 的一个 Overwrite 会替换本步累积值，并按当前实现跳过本步其他普通写；DeltaChannel 找到 Overwrite 后直接采用其包装值。应用做整体压缩时，必须协调与并行 messages 写入的关系；这个字段控制不是跨进程互斥锁。

## 路由、子图与人类继续输入

普通 edge 与条件 edge 是编译时路由；Command 可附 update、goto、resume、graph=Command.PARENT。动态 goto 不自动删除已有静态 edge；END 是不再发往普通节点的终点标识，不是取消已排程兄弟任务的总开关。需要结合图实际边与上层 middleware 构图解释结果。

子图作为节点复用时，要交代字段映射、checkpoint namespace 与父 saver；它与“工具启动另一张独立 Agent 图，最后交回摘要”的委派不同。后一种方式例如 DeerFlow [子 Agent](../../agents/deerflow/capabilities.md)，父 messages 不会因此变成子图所有状态的完整镜像。

interrupt 保存等待外部 resume 的位置。恢复会从节点开头重新执行，返回值按该任务的 interrupt 调用次序匹配；interrupt 前的副作用可能重做，应放入具有明确重试/幂等契约的任务。节点恢复、任务缓存、外部事务是三个层次，不能用“checkpoint 已保存”跳过后两者。

证据：[Command 与 interrupt](https://github.com/langchain-ai/langgraph/blob/bfcfea554ed5c7f7be562cebf8825e911b493ab1/libs/langgraph/langgraph/types.py#L833)、[编译与控制分支](https://github.com/langchain-ai/langgraph/blob/bfcfea554ed5c7f7be562cebf8825e911b493ab1/libs/langgraph/langgraph/graph/state.py#L1749)。

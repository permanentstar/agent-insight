---
id: "claude-context"
title: "Claude Code：压缩与记忆层次"
subject: "claude"
status: "frozen-document"
baselines: ["claude-frozen-documents"]
sources: ["claude-march"]
depends_on: ["claude-migrated"]
evidence: ["historical-document"]
verified_scope: "冻结研究原稿的层次重整；源码 snapshot 的来源和 SHA 未知，原稿描述未独立核验，不代表当前线上实现。"
---

# Claude Code：压缩与记忆层次

compact 包含多种处理：有的改变本地消息，有的只改变 API 请求视图，有的在后台生成摘要。先定位处理对象和采用时机，才能判断一次压缩改变了什么。

![Claude 历史 query 依次治理工具结果、局部内容和请求视图，再决定正式压缩；后台 session memory 与长期 memory 分别供不同消费者使用](../../assets/claude-context.svg)

## 当前轮请求的处理层

| 处理层 | 输入 / 输出与 owner | 是否在此生成 LLM 摘要 | 算法与作用范围 |
|---|---|---|---|
| tool result budget | 过大结果外置，消息保留预览与引用 | 否 | 局部结果处理，不能称全局摘要 |
| snip | query 前的局部历史视图 | 未知 | 算法实现缺少证据 |
| microcompact：time-based | 旧 tool_result 在本地改成更小内容 | 否 | 会改变本地 messages |
| microcompact：cached | API 层 cache_edits，保留本地消息 | 否 | 条件成立才走；不可用本地数组大小度量 |
| contextCollapse | query 的 collapsed view | 未知 | 入口存在，算法实现缺少证据 |
| autocompact | 上下文压力判断 | 否 | 决策层；具体摘要由后续路径提供 |
| session memory compact | 已生成的会话记忆 + 保留近期消息 | 读取时否 | 摘要模型成本发生在后台 extraction |
| compactConversation | 历史 → 模型摘要 | 是 | 正式摘要路径，成功后还需重建附件等 |
| buildPostCompactMessages | boundary、summary、attachments、hook messages | 否 | 拼装供后续 query 使用的上下文 |

顺序依据：[上下文分层与执行顺序](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-march.md#L856)。这里“先后”不表示每轮必走全部算法；gates、上下文压力和前一层效果都可能使后续路径不触发。触发阈值和实际进入哪些分支，由配置与请求压力共同决定。

## 正式压缩的写入、读取与覆盖边界

session memory extraction 在 post-sampling 条件满足后异步维护当前会话的记忆文件；sequential 包装避免同进程并发写。compact 读取方先协调正在进行的 extraction，再读取已有文件，用消息覆盖标记选择保留尾部；文件生成与此次 compact 读取不是同一个模型调用。

| 当前位置 | 关联状态 | 为什么要区分 |
|---|---|---|
| 后台摘要生成 | lastSummarizedMessageId 等增量位置 | 确定下一次抽取从哪里开始 |
| compact 读取现成记忆 | lastMemoryMessageUuid 等覆盖位置 | 决定哪些消息已被摘要覆盖，哪些须保留 |
| fallback full compact | 历史摘要请求 | 前一条路不足时才产生新 summary |
| compact 后重建 | boundary + summary + 附件/hook | 摘要文本本身不足以重建工具、文件和技能上下文 |

机制研究见[写读时序](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-march.md#L1042)、[完整 compact 时序](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-march.md#L1120)。跨会话 ancestry 与事务保证仍缺少证据；覆盖逻辑应按消息标记理解，不能仅按文件写入时间推断。

## 记忆不是一份共享缓存

| 机制 | 生命周期 / producer → consumer | 与主请求的关系 |
|---|---|---|
| Relevant Memory Prefetch | 每个 turn 发 side-query 选择长期 memory，供本轮后续 iteration | 不等待首轮；返回晚则本轮失效，不延到下一 turn |
| Session Memory Extraction | 当前 session 的后台摘要文件 → compact | 为会话压缩续接准备，不承担全部长期记忆 |
| Extract Memories | turn 结束后抽取 → durable/auto memory | 跨 session 的信息积累，和当前 compact 没有同一同步边界 |
| Dream / AutoDream | 长期 memory 集合 → 整理后的索引/内容 | 条件启用后的后台治理，不是主 query 压缩 |

见[四条记忆链路](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-march.md#L782)。recall 用模型 side-query 选择文件，不是 embedding 检索；能力均受 feature/settings gates 控制。功能入口存在与 feature/settings gates 放行是不同条件；客户端的记忆机制也不能直接扩展到其他产品界面。

## 失败与取舍

| 场景 | 历史描述 | 不能推出什么 |
|---|---|---|
| 首轮直答且 recall 返回慢 | 主请求不等 side-query，本轮可能无该记忆 | 不能说每次回答都已检索全部长期记忆 |
| cached microcompact 生效 | 本地历史可保持不变 | 不能用文件变小证明或否认请求减重 |
| contextCollapse 缺实现 | 只确认调用边界和视图职责 | 不补成确定的 LLM/非 LLM 算法 |
| full compact 成功 | 重建短上下文继续工作 | 不能证明摘要无信息损失或工具效果可重放 |

分层治理允许局部瘦身先于整段摘要，后台工作也可缩短关键请求路径；其代价是本地历史、请求视图和记忆新鲜度不再是同一状态。比较时应先选定测量对象，再谈成本和一致性。测量性能或信息保留时，需要分别固定这些状态与覆盖范围。

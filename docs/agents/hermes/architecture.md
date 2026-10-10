---
id: "hermes-migrated"
title: "Hermes：旧材料的对象与链路"
subject: "hermes"
status: "migrated-unverified"
baselines: []
sources: ["hermes"]
depends_on: []
evidence: ["historical-document"]
verified_scope: "旧 Hermes 架构笔记消化；本次主干更新后的逐条行为尚未刷新。"
---

# Hermes：旧材料的对象与链路

旧材料把 AIAgent 视为运行编排中心，但各入口如何构造和复用它必须分别分析。CLI、Gateway、ACP 不是三套相同生命周期。

| 层次 | 对象/机制 | 旧文归纳 | 待最新核验 |
|---|---|---|---|
| 接入 | HermesCLI、Gateway、ACP | 将不同输入转成单轮 Agent 请求 | 实例复用范围、平台 session 路由 |
| 编排 | AIAgent.run_conversation | prompt/history、模型循环、工具、重试与压缩 | 初始化边界、并发、取消与终止条件 |
| 模型协议 | ProviderTransport、ProviderProfile | 协议规范化与 provider 元数据分离 | 请求/响应转换及 fallback 路径 |
| 工具 | registry、toolsets、model_tools | 注册、启用集合、schema 和真实 handler 分层 | check_fn 是可用性还是授权；执行校验点 |
| 状态 | SessionDB、memory、压缩器 | 保存会话、用户记忆与模型上下文 | 何时写入、重启能恢复哪类进行中工作 |

旧 CLI 链路为 hermes_cli.main 分发、HermesCLI 加载配置和历史、按需初始化 AIAgent、run_conversation 调模型与工具、保存会话并展示。不能据最终写入 DB 推定工具中断可安全自动重放。

独有专题保留 Gateway 的长驻消息平台适配、ACP 编辑器协议、transport/profile 分离、记忆/skills 与定时能力。旧文版本号为 0.13.0；本版不把它作为最新仓库版本，也不默认其 checkpoint 是 LangGraph checkpoint 或 Pico Task checkpoint。

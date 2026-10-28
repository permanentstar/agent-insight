---
id: "baselines"
title: "版本说明"
subject: "book"
status: "index"
baselines: []
sources: []
depends_on: []
evidence: []
verified_scope: "本页维护书籍组织与阅读契约，不声明目标 Agent 运行验证。"
---

# 版本说明

版本号帮助定位实现所处的阶段，固定提交定位本书实际阅读的源码。下表把**版本定位**与**研究内容**分开：版本取自固定提交中的包元数据；提交位于发布之后时，说明为该版本后的主干。Pi Durable 更新到 2026-10-19，其余主干观察点为 2026-10-09；Claude 使用 2026-03-31 冻结源码。

| 研究对象 | 版本定位 | 固定提交 | 本书研究内容 |
|---|---|---|---|
| Pi AgentSession | 1.1.0 之后的 main | [f1b2e77f5b](https://github.com/earendil-works/pi/commit/f1b2e77f5b13b2a199b1052cb79c235451afe7d7) | 默认 coding-agent 的会话、模型／工具循环、历史和扩展 |
| Pi Durable | 1.3.0 之后的 main，含 Unreleased | [2ec55d808d](https://github.com/earendil-works/pi/commit/2ec55d808d455b1a64a2bf7888198207a096120a) | 持久 Task、休眠、嵌套工具、codemode、宿主唤醒和遥测 |
| DeerFlow | 2.2.0-dev，main | [b842e06be1](https://github.com/bytedance/deer-flow/commit/b842e06be19f04280a9e5e12f90da04d0c6f09a5) | Lead 图、middleware、产品 run 与子 Agent |
| Codex | 约 0.162.0 发布时期的 main | [2351d9e1b6](https://github.com/openai/codex/commit/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4) | 开源 core 的 Thread、Turn、Step、工具与历史 |
| Hermes | 2026-10-09 main 快照；包元数据为 0.0.0 占位 | [8bff64d6ed](https://github.com/NousResearch/hermes-agent/commit/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f) | 原生循环、宿主复用、memory、委派和调度 |
| LangChain | langchain 1.4.4，core 1.6.9，master | [34489d6143](https://github.com/langchain-ai/langchain/commit/34489d61433cbf5044a630de2e7797e361672900) | 模型／工具协议、Agent 构图、middleware 与集成 |
| LangGraph | 1.2.14，main | [bfcfea554e](https://github.com/langchain-ai/langgraph/commit/bfcfea554ed5c7f7be562cebf8825e911b493ab1) | 超步、通道、任务 writes、checkpoint 和路由 |
| DeepSeek Harness | 0.2.1-alpha.2，master | [d743267388](https://github.com/deepseek-ai/deepseek-harness/commit/d743267388641bc76f17c45ce8b4c231aed1d32c) | developer preview 的驱动、事件、surface 与插件 |
| Lane Harness | 0.85.1 之后的历史 main | [6671c60476](https://github.com/earendil-works/pi/commit/6671c604766b3670ed95f405aa7856835d0ca702) | Lane、Operation、Drive 与旧进程拓扑 |
| Claude Code | 2026-03-31 原始源码快照；发布号未确认 | [9f51e71641](https://github.com/permanentstar/claude-code-source-leak/commit/9f51e71641c1472293ebe4a7968b44455c00f0ba) | query、工具、压缩、记忆与会话宿主 |

Pi 的包版本来自各固定提交的 package.json；本地标签关系分别为 v1.1.0 之后 11 个提交、v1.3.0 之后 33 个提交，以及历史 v0.85.1 之后 79 个提交。具体能力按表中 SHA 阅读。[AgentSession 包版本](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/package.json#L3)、[Durable 包版本](https://github.com/earendil-works/pi/blob/2ec55d808d455b1a64a2bf7888198207a096120a/packages/durable/package.json#L3)。

Codex 同期正式发布为 [0.162.0](https://github.com/openai/codex/releases/tag/rust-v0.162.0)，发布时间 2026-10-08；本书固定的是次日的 main 提交，与发布标签位于分叉的提交线上。源码中的 0.0.0／0.0.0-dev 是开发占位值。Hermes 则从安装生成的 install-stamp 读取 baseVersion，裸源码没有对应安装戳时返回 0.0.0，因此本书以日期和固定 SHA 定位。[Codex 开发版本](https://github.com/openai/codex/blob/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4/codex-cli/package.json#L3)、[Hermes 版本入口](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/hermes_cli/__init__.py#L10)。

框架与应用的版本分别取自 [DeerFlow 后端元数据](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/pyproject.toml#L3)、[LangChain](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/langchain_v1/pyproject.toml#L24)、[LangChain core](https://github.com/langchain-ai/langchain/blob/34489d61433cbf5044a630de2e7797e361672900/libs/core/pyproject.toml#L24)、[LangGraph](https://github.com/langchain-ai/langgraph/blob/bfcfea554ed5c7f7be562cebf8825e911b493ab1/libs/langgraph/pyproject.toml#L7) 和 [DeepSeek agent-loop](https://github.com/deepseek-ai/deepseek-harness/blob/d743267388641bc76f17c45ce8b4c231aed1d32c/packages/core/agent-loop/package.json#L4)。

## 实现阶段与依赖组合

Pi 的官方 coding-agent 默认入口仍使用 AgentSession；最新 main 可追到 createAgentSessionFromServices。Pi Durable 是独立的实验库，Pico5 是其早期设计名称，本书当前分册以最新实现为准。旧实验 TUI、Session Worker 与 client/server 已从主干删除，不能再使用旧启动命令；当前从 packages/durable 的聊天、编码与宿主示例进入。Lane Harness 是历史方案，没有成为官方 coding-agent 的默认生产入口。[默认 CLI 构造](https://github.com/earendil-works/pi/blob/2ec55d808d455b1a64a2bf7888198207a096120a/packages/coding-agent/src/main.ts#L842)、[删除实验产品栈](https://github.com/earendil-works/pi/commit/7472cda0d)、[当前示例入口](https://github.com/earendil-works/pi/blob/2ec55d808d455b1a64a2bf7888198207a096120a/packages/durable/test/examples/14-chat.ts)。

Durable 包版本为 1.3.0，但本书固定提交还包含 Unreleased 的 sleeping、wake、崩溃循环保护及 telemetry，不能将这些能力都归给已发布的 1.3.0。SQLite 自动升级到 schema v2 后，1.3.0 及更早实现不能重开该数据库；这项兼容条件与普通 API 使用分开核对。

DeerFlow 的应用依赖锁定 LangChain **1.3.14**、LangGraph **1.2.9** 和 langgraph-checkpoint **4.2.0**。LangChain、LangGraph 分册研究各自独立主干，二者与 DeerFlow 的锁定包不是同一个运行组合。框架章节解释其自身语义；判断应用行为时，以应用的实际调用和依赖组合为准。[DeerFlow 依赖锁](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/uv.lock)。

Claude Code 分册以 owner 提供的源码仓库原始提交为固定快照。仓库 README 标注 source map 日期为2026-03-31；四月与五月补充的构建、类型和私有依赖 stub 不作为原始实现证据。静态核验覆盖 query、工具、压缩、记忆与相关宿主路径，不能据此判断当前线上产品或完整私有依赖。Claude Code、模型 API 和 Managed Agents 也分别讨论，不将托管平台契约视为客户端内部实现。

## 研究方法与适用范围

主体分析通过源码中的构造、调用、字段和写入顺序解释行为，未运行目标 Agent、真实模型请求或故障注入，也没有性能、摘要质量或恢复成功率的测量。源码事实、静态推导与设计建议分别表达；某项实现证据缺失时，保留为未知，不据此判断它没有能力。

Claude 的 snip/contextCollapse 算法及部分 feature gate 所引模块未包含在快照中；in-process 队友接单已可追到消息采用与 query，但跨崩溃确认仍需另证。Radius 外部网关的恢复实现也缺少足够的执行证据。正文会在相关机制处说明这些具体边界。

完整版本登记保存在 [baselines.json](https://github.com/permanentstar/agent-insight/blob/main/baselines.json)。后续研究仍通过固定提交引用定位实现，版本说明集中在本页。

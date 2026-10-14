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

本书研究的是明确版本中的架构和执行机制。七个源码仓库的主干观察日期为 **2026-10-09**；引用使用固定 commit 链接，读者可以据此复现文件和调用位置。章节正文围绕机制展开，版本和研究方法集中在本页，避免每次进入调用链都重新阅读基线说明。

| 研究对象 | 分支 | 固定提交 | 研究范围 |
|---|---|---|---|
| Pi AgentSession / Pico5 | main | [f1b2e77f5b13b2a199b1052cb79c235451afe7d7](https://github.com/earendil-works/pi/commit/f1b2e77f5b13b2a199b1052cb79c235451afe7d7) | 主干研究 |
| DeerFlow | main | [b842e06be19f04280a9e5e12f90da04d0c6f09a5](https://github.com/bytedance/deer-flow/commit/b842e06be19f04280a9e5e12f90da04d0c6f09a5) | 主干研究 |
| Codex | main | [2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4](https://github.com/openai/codex/commit/2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4) | 主干研究 |
| Hermes | main | [8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f](https://github.com/NousResearch/hermes-agent/commit/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f) | 主干研究 |
| LangChain | master | [34489d61433cbf5044a630de2e7797e361672900](https://github.com/langchain-ai/langchain/commit/34489d61433cbf5044a630de2e7797e361672900) | 主干研究 |
| LangGraph | main | [bfcfea554ed5c7f7be562cebf8825e911b493ab1](https://github.com/langchain-ai/langgraph/commit/bfcfea554ed5c7f7be562cebf8825e911b493ab1) | 主干研究 |
| DeepSeek Harness | master | [d743267388641bc76f17c45ce8b4c231aed1d32c](https://github.com/deepseek-ai/deepseek-harness/commit/d743267388641bc76f17c45ce8b4c231aed1d32c) | 主干研究 |
| Lane Harness | main | [6671c604766b3670ed95f405aa7856835d0ca702](https://github.com/earendil-works/pi/commit/6671c604766b3670ed95f405aa7856835d0ca702) | 历史方案 |
| Claude Code | 原始快照 | [9f51e71641c1472293ebe4a7968b44455c00f0ba](https://github.com/permanentstar/claude-code-source-leak/commit/9f51e71641c1472293ebe4a7968b44455c00f0ba) | 冻结源码研究，不定时更新 |

## 实现阶段与依赖组合

Pi 的官方 coding-agent 默认入口使用 AgentSession。Pico5 / pi-durable 是实验持久架构，实验前端与 Session Worker 使用这条执行路线。Lane Harness 是历史方案，没有成为官方 coding-agent 的默认生产入口；它的 API 发布与包导出不能代替这一判断。

DeerFlow 的应用依赖锁定 LangChain **1.3.14**、LangGraph **1.2.9** 和 langgraph-checkpoint **4.2.0**。LangChain、LangGraph 分册研究各自独立主干，二者与 DeerFlow 的锁定包不是同一个运行组合。框架章节解释其自身语义；判断应用行为时，以应用的实际调用和依赖组合为准。[DeerFlow 依赖锁](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/uv.lock)。

Claude Code 分册以 owner 提供的源码仓库原始提交为固定快照。仓库 README 标注 source map 日期为2026-03-31；四月与五月补充的构建、类型和私有依赖 stub 不作为原始实现证据。静态核验覆盖 query、工具、压缩、记忆与相关宿主路径，不能据此判断当前线上产品或完整私有依赖。Claude Code、模型 API 和 Managed Agents 也分别讨论，不将托管平台契约视为客户端内部实现。

## 研究方法与适用范围

主体分析通过源码中的构造、调用、字段和写入顺序解释行为，未运行目标 Agent、真实模型请求或故障注入，也没有性能、摘要质量或恢复成功率的测量。源码事实、静态推导与设计建议分别表达；某项实现证据缺失时，保留为未知，不据此判断它没有能力。

Claude 的 snip/contextCollapse 算法及部分 feature gate 所引模块未包含在快照中；in-process 队友接单已可追到消息采用与 query，但跨崩溃确认仍需另证。Radius 外部网关的恢复实现也缺少足够的执行证据。正文会在相关机制处说明这些具体边界。

完整版本登记保存在 [baselines.json](https://github.com/permanentstar/agent-insight/blob/main/baselines.json)。后续研究仍通过固定提交引用定位实现，版本说明集中在本页。

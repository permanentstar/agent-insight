---
id: "map"
title: "研究对象与阅读地图"
subject: "book"
status: "index"
baselines: []
sources: []
depends_on: []
evidence: []
verified_scope: "本页维护书籍组织与阅读契约，不声明目标 Agent 运行验证。"
---

# 研究对象与阅读地图

每个对象拥有统一的问题集合，但不强行解释成相同实现。框架、应用和历史版本应在比较表中显式区分。

| 对象 | 层次与状态 | 入口 |
|---|---|---|
| Pi AgentSession | 官方默认 coding-agent 主链路 | [分册](../agents/pi/index.md) |
| Pico5 / pi-durable | 同仓库的实验持久架构，独立分析 | [分册](../agents/pi-durable/index.md) |
| Lane Harness | 已退出最新主干，历史冻结 | [附录](../history/pi-lane/index.md) |
| DeerFlow | 建立在 LangChain/LangGraph 上的应用与 Harness | [分册](../agents/deerflow/index.md) |
| Claude Code | 用户指定冻结的历史材料 | [分册](../agents/claude/index.md) |
| Codex | 重建 Rust core 源码分析，旧官方实践单独保存 | [分册](../agents/codex/index.md) |
| Hermes | CLI、Gateway、ACP 入口与 Agent 平台 | [分册](../agents/hermes/index.md) |
| LangChain | agent 构造与 middleware 等框架语义 | [分册](../frameworks/langchain/index.md) |
| LangGraph | 图状态、调度、checkpoint 与恢复 | [分册](../frameworks/langgraph/index.md) |
| DeepSeek Harness | 新增源码研究对象 | [分册](../agents/deepseek/index.md) |

统一阅读顺序是定位与能力边界、层次与词典、构造/注入/生命周期、一次请求、状态与上下文、工具/权限/扩展、并发/故障/恢复、取舍与独有专题。小节深入时给出“当前位置”表，不从函数清单直接跳入底层状态机。

横向比较有[统一入口](../comparisons/index.md)。只在可比范围内得出取舍：LangGraph 的持久调度不能和一个产品 UI 功能直接排名；旧 Claude 快照也不能证明当前云端行为。

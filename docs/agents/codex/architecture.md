---
id: "codex-plan"
title: "Codex：源码重建边界"
subject: "codex"
status: "pending"
baselines: ["codex-20261009"]
sources: []
depends_on: []
evidence: []
verified_scope: "已定位源码重建问题；尚未完成 core 执行与持久化的核验。"
---

# Codex：源码重建边界

本页明确重构范围：官方使用文档提供规则和接口语义，Rust core 才能解释对象所有权与实际执行。当前源码已更新，但此页仅是分析入口。

| 层次 | 优先核验 | 要区分的对象 |
|---|---|---|
| CLI / TUI / app-server | 请求如何进入 core，配置如何被合并 | UI 会话、线程 ID、Git checkout |
| core 组合与任务 | Session / ThreadManager 等实际构造与生命周期 | 持久线程与进程内任务 |
| turn / inference | 模型请求、流事件、工具调度 | 事件发布与状态写入 |
| 工具与授权 | router、sandbox、approval | 发现能力、受理请求和执行许可 |
| 状态与上下文 | rollout、context_manager、compaction | 日志、当前历史视图与请求快照 |

不得把桌面 App 所有能力直接归入开源 CLI，也不得把一个线程 ID 推成会话树 branch 或 Git branch。[旧官方实践](official-practices.md) 已与源码待分析章分开。

首次源码分析须按入口追到 provider 请求、tool handler 和 rollout 写入，再写状态表。本页不声明这些名称在本基线上的完整协作机制已验证。

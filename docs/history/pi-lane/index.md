---
id: "lane-index"
title: "Lane Harness 历史附录"
subject: "pi-lane"
status: "index"
baselines: ["pi-lane-20260916"]
sources: ["pi-lane", "pi-chord", "pi-radius"]
depends_on: ["lane-architecture", "lane-runtime", "pi-evolution", "pi-components-migrated"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# Lane Harness 历史附录

Lane 按用户定义没有转正：未成为官方 Agent 默认生产入口。库默认导出不改变这个结论；最新主干已经删除旧实现。

阅读顺序：[概念层次](architecture.md) → [状态分派、进程链与恢复](runtime.md) → [路线演进](evolution.md) → [Chord 与 Radius 专题](components.md)。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| 完整 Drive 分派面、Client/Server/Worker/协议层次及故障语义已按冻结源码整理。 | 没有运行历史栈；外部 Radius 网关实现不在可读源码范围。Chord 与当前 Pico5 的连接单独标明当前基线。 |

各章先给图和词典，再进入构造、调用与执行点；沿用[统一模板](../../templates/project.md)。基线以 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期为 2026-10-09，整理日期为 2026-10-10。静态整理完成不等于目标系统运行验证。

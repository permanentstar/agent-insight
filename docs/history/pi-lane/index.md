---
id: "lane-index"
title: "Lane Harness 历史附录"
subject: "pi-lane"
status: "index"
baselines: ["pi-lane-20260916"]
sources: ["pi-lane", "pi-chord", "pi-radius"]
depends_on: []
evidence: []
verified_scope: "历史附录边界已固定；非当前默认能力。"
---

# Lane Harness 历史附录

Lane 按 owner 的标准没有转正：未成为官方 Agent 默认生产入口。曾成为库的默认导出并不改变这个结论；最新主干已移除旧实现。

保留 [概念与层次](architecture.md)、[演进证据](evolution.md) 和 [Chord/Radius 旧专题](components.md)。冻结在原材料的源码 SHA，后续不定时追新；只有补证或纠错才改本附录。

正文比较的是 AgentSession 与 Pico5；需要解释旧设计取舍时可以引用此附录，并标为历史。

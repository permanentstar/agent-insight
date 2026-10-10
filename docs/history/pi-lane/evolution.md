---
id: "pi-evolution"
title: "Pi 路线演进与“转正”口径"
subject: "pi-lane"
status: "frozen-source"
baselines: ["pi-lane-20260916", "pi-20261009"]
sources: ["pi-lane"]
depends_on: ["pi-architecture", "durable-architecture"]
evidence: ["source", "official", "static-inference"]
verified_scope: "API 发布、产品入口、删除/迁移时间线已核验；未来生产迁移承诺与全部决策动机未知。"
---

# Pi 路线演进与“转正”口径

按本书口径，官方 Agent 默认生产使用才叫转正。Lane 没转正；当前默认仍是 AgentSession。下面区分库导出、实验前端和实际默认三种事实。

| 观察点 | 已验证事实 | 不能推定 |
|---|---|---|
| 0.84.0，2026-08-06 | Session/AgentHarness 从 experimental 提升到 pi-agent-core 默认导出；tag 的 index.ts 与 changelog 一致 | 官方 pi CLI 已迁 Lane；当时未完成的分支到 9 月仍未完成 |
| 原本地 SHA 6671c604，2026-09-16 | 包版本 0.85.1；正式 cli.ts 到 main→AgentSession；远程前端被 build 与发布检查排除 | 不能说 Lane 没有代码/不能自集成；也不能说存在官方产品部署入口 |
| 1.0.0，2026-10-01 | 旧 Harness 从 agent-core 删除；durable 成独立包；实验 TUI/worker 改用 Pico5 | 正式默认已切 durable，或能力完整等价 |
| 本次主干 2026-10-09 | 正式 main 仍构造 AgentSession；实验 Worker 使用 durable | 未来切默认的日期与承诺 |

源码证据：[提升 API 的提交](https://github.com/earendil-works/pi/commit/44289550aa06750542c0ace8ab4bac0c7e68ce54)、[0.84.0 tag 对应源码](https://github.com/earendil-works/pi/blob/a5f43bf8aff3c55752432655f7334e3dafd1e256/packages/agent/src/index.ts)、[旧正式入口](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/coding-agent/src/main.ts#L816)、[旧发布排除](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/coding-agent/package.json)、[旧消费者检查](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/scripts/coding-agent-consumer.mjs#L79)、[最新 main](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/main.ts#L841)。

删除和迁移的上游说明见 [删除旧 Harness](https://github.com/earendil-works/pi/commit/7fd478a2e888ebc28869566f33a186303d372838) 和 [移植实验 client/server](https://github.com/earendil-works/pi/commit/48dd1e2f0f9dc7a767d7e5ee693bc85a4d6db38c)。

“为什么放弃 Lane”没有找到完整的上游决策说明。旧 runtime-simplification 文档说明作者此前确实在削减复杂度；Pico5 规范明确讨论保留 Pico3 的 host 形状、移除固定 rewindable/sticky、namespace router、semantic view events 与手工 Chord bridge，改用类型化 Document、结构化 conversation watch 和统一 Submission。这能支持接口演进事实，不能证明全部决策动机。

“从专用 Operation 变为通用 Task 以统一更多工作”是本书根据模型对照作的静态解释；没有将其伪装成上游作者的正式理由。上游明确变更、设计解释与原因未知保持分开。

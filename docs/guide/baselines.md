---
id: "baselines"
title: "源码基线与核验范围"
subject: "book"
status: "index"
baselines: []
sources: []
depends_on: []
evidence: []
verified_scope: "本页维护书籍组织与阅读契约，不声明目标 Agent 运行验证。"
---

# 源码基线与核验范围

基线记录的是一次官方主干观察点；页面状态记录正文核验程度。更新源码不等于更新研究，二者必须分开。

基线事实源为根目录 [baselines.json](https://github.com/permanentstar/agent-insight/blob/main/baselines.json)，完整 SHA 对应可复现的源文件版本。此表是初版阅读摘要；新增基线后同时更新摘要，不替代 JSON。

| 基线 ID | 分支 | SHA | 提交时间（原时区） | 角色 |
|---|---|---|---|---|
| `pi-20261009` | main | `f1b2e77f5b13b2a199b1052cb79c235451afe7d7` | 2026-10-09T09:40:08+02:00 | current |
| `deerflow-20261009` | main | `b842e06be19f04280a9e5e12f90da04d0c6f09a5` | 2026-10-09T17:58:09+08:00 | current |
| `codex-20261009` | main | `2351d9e1b608e6f9d9a3699b71d7eb39ee41cfa4` | 2026-10-09T05:12:54Z | current |
| `hermes-20261009` | main | `8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f` | 2026-10-09T02:59:16-07:00 | current |
| `langchain-20261009` | master | `34489d61433cbf5044a630de2e7797e361672900` | 2026-10-08T18:11:07-04:00 | current |
| `langgraph-20261009` | main | `bfcfea554ed5c7f7be562cebf8825e911b493ab1` | 2026-10-08T16:10:55-07:00 | current |
| `deepseek-20261009` | master | `d743267388641bc76f17c45ce8b4c231aed1d32c` | 2026-10-09T17:31:32+08:00 | current |
| `pi-lane-20260916` | main | `6671c604766b3670ed95f405aa7856835d0ca702` | 2026-09-16T12:11:16+02:00 | historical |
| `claude-frozen-documents` | 未知 | `未确定` | 未知 | historical |

所有 current 基线的观察日期为 2026-10-09。Local HEAD 和 fetch 后的 origin 对应相同提交；DeerFlow、Hermes 和 LangChain 的既有 WIP 保留。本书的已核验源码结论引用 Git 固定版本，不将 WIP 当作上游实现。

没有 SHA 的 Claude 资料仅冻结到文档 revision，不伪造源码基线。DeerFlow 实际使用的 LangChain/LangGraph 依赖组合仍待登记：当前框架各自主干不能自动当成 DeerFlow 运行依赖。

每次更新新增带日期或 SHA 的基线 ID，保留仍被历史章节引用的旧基线。逐页核验后迁移页面引用；未检查的页面保留旧 ID，不通过改一个全局 SHA 把整本书“刷新”。

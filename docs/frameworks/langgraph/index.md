---
id: "langgraph-index"
title: "LangGraph 分册"
subject: "langgraph"
status: "index"
baselines: ["langgraph-20261009"]
sources: ["langchain-stage4"]
depends_on: ["langgraph-migrated", "langgraph-advanced"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# LangGraph 分册

LangGraph 将图定义编译为可执行计算，以超步调度任务、合并 channel 写入并保存 checkpoint。图定义、活动 Loop 和持久 thread 身份各有生命周期。

| 章节 | 要回答的问题 |
|---|---|
| [超步与 checkpoint](architecture.md) | tick、runner、writes 和 saver 怎样推进一次调用？ |
| [合并与恢复边界](advanced.md) | Overwrite、Delta、Command、子图和 interrupt 分别改变什么？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。

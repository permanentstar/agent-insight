---
id: "deepseek-index"
title: "DeepSeek Harness 分册"
subject: "deepseek"
status: "index"
baselines: ["deepseek-20261009"]
sources: []
depends_on: ["deepseek-plan", "deepseek-capabilities", "deepseek-context"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# DeepSeek Harness 分册

DeepSeek Harness 通过插件上下文装配能力，AgentLoop 工厂管理运行资源，ReactLoopAgent 推进模型工具循环，Session 保存有序事件和模型可见 surface。

| 章节 | 要回答的问题 |
|---|---|
| [插件与一次执行](architecture.md) | scope、工厂、turn、step 和 Session 写入如何协作？ |
| [Profile、审批与子 Agent](capabilities.md) | 定义、provider、consumer 和执行身份怎样连接？ |
| [surface 与压缩](context.md) | 审计历史和模型视图怎样分开，摘要如何提交？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。

---
id: "deepseek-index"
title: "DeepSeek Harness 分册"
subject: "deepseek"
status: "index"
baselines: ["deepseek-20261009"]
sources: []
depends_on: ["deepseek-plan", "deepseek-capabilities", "deepseek-context"]
evidence: []
verified_scope: "入口按共同职责定位并连接实现专题；正文的静态证据、历史范围与教学核验各自说明。"
---

# DeepSeek Harness 分册

DeepSeek Harness 通过插件上下文装配能力，AgentLoop 工厂管理运行资源，ReactLoopAgent 推进模型工具循环，Session 保存有序事件和模型可见 surface。

## 在共同架构中定位

先把本实现放到[共同职责地图](../../comparisons/common-model.md)，再沿下面的章节追到实际对象。这里对齐的是问题，具体类型和作用域仍按本分册解释。

| 共同职责 | 本实现中的定位 |
|---|---|
| 产品宿主 | profile 与 Cordis 插件树装配 AgentLoop 及运行服务。 |
| 工作推进 | ReactLoopAgent 的 phase 组织活动，turn/step 推进反馈。 |
| 模型与动作 | llm 服务准备请求；tools 服务执行并记录调用与结果。 |
| 历史与请求 | Session event 保存事实，surface 选择模型贡献，persistence handle 管存储。 |
| 扩展与控制 | pre-step、审批、压缩和子执行由具体插件组合，不自动拥有统一默认策略。 |

## 分册阅读

| 章节 | 要回答的问题 |
|---|---|
| [插件与一次执行](architecture.md) | scope、工厂、turn、step 和 Session 写入如何协作？ |
| [Profile、审批与子 Agent](capabilities.md) | 定义、provider、consumer 和执行身份怎样连接？ |
| [surface 与压缩](context.md) | 审计历史和模型视图怎样分开，摘要如何提交？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。

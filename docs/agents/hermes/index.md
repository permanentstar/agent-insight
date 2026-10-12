---
id: "hermes-index"
title: "Hermes 分册"
subject: "hermes"
status: "index"
baselines: ["hermes-20261009"]
sources: ["hermes"]
depends_on: ["hermes-migrated", "hermes-context", "hermes-capabilities"]
evidence: []
verified_scope: "入口按共同职责定位并连接实现专题；正文的静态证据、历史范围与教学核验各自说明。"
---

# Hermes 分册

Hermes 的 AIAgent 是原生运行门面，不同宿主负责会话身份、生命周期和输出。对话阶段、工具调度、记忆与压缩由各自模块执行；先确认宿主，再追门面下的实际调用。

## 在共同架构中定位

先把本实现放到[共同职责地图](../../comparisons/common-model.md)，再沿下面的章节追到实际对象。这里对齐的是问题，具体类型和作用域仍按本分册解释。

| 共同职责 | 本实现中的定位 |
|---|---|
| 产品宿主 | CLI、Gateway、ACP 决定 AIAgent 的构造、缓存与交互。 |
| 工作推进 | 原生 conversation_loop 逐 iteration 推进；app-server 可接管完整 turn。 |
| 模型与动作 | ProviderTransport 规范化协议；工具轮次经 executor 和 registry 执行。 |
| 历史与请求 | SessionDB、当前请求、压缩候选与长期 memory 各有范围。 |
| 扩展与控制 | Skills、hooks、平台回调及委派由宿主和能力配置组合。 |

## 分册阅读

| 章节 | 要回答的问题 |
|---|---|
| [宿主与循环](architecture.md) | CLI/Gateway 如何构造 AIAgent，一次 turn 如何推进？ |
| [记忆与提交许可](context.md) | 摘要候选、fence、会话轮换和数据库提交怎样衔接？ |
| [平台与委派](capabilities.md) | ACP、工具目录、子 Agent、cron 和交付由谁控制？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。

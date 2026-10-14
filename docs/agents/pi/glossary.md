---
id: "pi-glossary"
title: "AgentSession 概念词典"
subject: "pi-session"
status: "verified-source"
baselines: ["pi-20261009"]
sources: []
depends_on: []
evidence: ["source"]
verified_scope: "词典中的层次、构造与对象关系已静态核验；未执行目标 Agent。"
---

# AgentSession 概念词典

分册入口已经给出任务主线。这一页先介绍沿线会遇到的对象：AgentSession 组织产品行为，Agent 执行请求，SessionManager 保存会话记录。阅读后面的流程时，可以回到本页确认对象的职责与生命周期。

| 术语 | 层次 | 白话含义 / owner | 持久性与生命周期 |
|---|---|---|---|
| AgentSessionRuntime | 产品入口 | 持有活动 session、services 和重建工厂，协调会话替换 | 进程内；保存当前活动对象与重建工厂 |
| AgentSession | 产品编排 | 组合 Agent、SessionManager、资源和设置，处理产品输入 | 进程内；事件处理会写会话 |
| Agent | 执行包装 | 持有当前消息、工具及流控制，调用 agent-loop | 进程内；每次请求循环创建活动运行 |
| agent-loop | 执行流程 | 驱动模型 turn、工具和续跑 | 一次执行的控制流程 |
| SessionManager | 历史与投影 | 追加会话条目，管理分支、leaf 与消息投影 | 文件内容可保留；对象本身是进程内句柄 |
| ModelRuntime | 模型服务 | 管理模型、认证及 provider 请求入口 | 可由调用者注入和复用，不能笼统称全局单例 |
| turn | 模型执行 | 一次 assistant 响应及其工具结果 | 一个用户任务可以包含多个 turn |
| steering / follow-up | 输入调度 | 流中插入输入 / 自然结束后续跑输入 | 由 Agent 队列在相应边界消费 |

对象之间的调用与历史读写关系见下图。具体装配步骤在[层次与构造](architecture.md)展开，一份输入怎样使用这些对象则在[主链路](loop.md)展开。

![CLI 或 SDK 装配 AgentSession；AgentSession 组织产品行为，Agent 与 agent-loop 驱动模型和工具，SessionManager 在旁保存历史并提供请求上下文](../../assets/pi-session.svg)

## 从注入关系区分相似名字

`AgentSessionConfig` 是创建产品会话时传入的依赖契约。下面节选其主线字段，省略可选工具、缓存与 UI 配置；这些字段保留源码名称：

```ts
export interface AgentSessionConfig {
  agent: Agent;
  sessionManager: SessionManager;
  settingsManager: SettingsManager;
  cwd: string;
  // 省略：模型轮换等可选配置；Agent
  // 和历史管理器仍是独立的必需依赖。
  resourceLoader: ResourceLoader;
  // 省略：由 SDK 直接提供的 customTools 定义。
  modelRuntime: ModelRuntime;
  // 省略：缓存预热、初始工具选择等可选字段。
}
```

这些字段把协作对象交给 AgentSession：agent 接受运行请求，sessionManager 提供历史，resourceLoader 提供资源，modelRuntime 提供模型服务。下一章展开这些对象怎样构造，以及何时开始执行。[依赖契约](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session.ts#L252)。

还有一个名字需要提前区分：`AgentSession._buildRuntime()` 是会话内部装配 ExtensionRunner 和工具 registry 的方法，`AgentSessionRuntime` 是产品宿主持有的会话管理对象。前者让扩展接入当前会话，后者在 new/resume 等操作时更换整份活动会话；阅读构造章时，前者出现在回调与扩展装配阶段，后者出现在产品持有和切换会话的位置。

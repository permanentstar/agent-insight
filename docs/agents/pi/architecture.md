---
id: "pi-architecture"
title: "AgentSession：层次、构造与生命周期"
subject: "pi-session"
status: "verified-source"
baselines: ["pi-20261009"]
sources: ["pi-session"]
depends_on: ["pi-glossary"]
evidence: ["source"]
verified_scope: "默认组合根、SDK 注入与主要对象生命周期已静态核验；未运行 CLI 或模型请求。"
---

# AgentSession：层次、构造与生命周期

Pi 将交互产品的会话管理、模型执行循环和历史存储分开。学习它时，先回答一个问题：用户提交“读取需求，修改导出逻辑，再运行验证”，究竟哪个对象负责把这份任务推进下去？答案是 AgentSession 组织产品行为，Agent 驱动当前执行，SessionManager 记录过去；三者合作完成工作。

![CLI 或 SDK 组合 AgentSession；AgentSession 调用 Agent 和模型工具，同时读写独立的 SessionManager 历史](../../assets/pi-session.svg)

## 三个层次，三种“会话”含义

最外层是**交互产品**。终端、RPC 或 SDK 接受输入，处理用户看到的事件和会话切换。AgentSession 是这层向执行内核提供的门面：它知道扩展、技能、设置、当前工具集合，也知道何时需要压缩历史。

中间是**当前执行**。Agent 持有模型、消息、工具和输入队列，将它们交给 agent-loop。循环知道怎样请求模型、执行工具、把结果反馈给下一轮；它不负责发现终端配置或维护会话文件目录。一次用户任务可以跨多次模型响应，AgentSession 对象也可以跨多个用户任务复用。

旁边是**历史与投影**。SessionManager 管理会话条目、parent 关系和当前 leaf，并从这些记录构造下一次请求需要的上下文。它保存“过去说过什么、当前选了哪条历史”，没有保存“正在 await 哪个工具函数”的程序栈。

| 对象 | 谁构造或提供 | 持有的主要内容 | 生命周期与作用域 |
|---|---|---|---|
| AgentSessionRuntime | 产品入口使用的工厂 | 活动 AgentSession 及创建、替换操作 | 进程内；切换会话可替换活动实例 |
| AgentSession | SDK 或 services 组合根 | Agent、SessionManager、模型服务、设置、资源与扩展 runner | 产品会话实例；跨多次 prompt |
| Agent | SDK 组合，注入会话 | 当前消息、模型、工具、activeRun、steer/followUp 队列 | 进程内执行对象；activeRun 是其中一次运行 |
| SessionManager | SDK 默认创建，或调用方注入 | 历史条目树、leaf、持久文件与投影方法 | 文件可跨进程保留；管理句柄重建 |
| ModelRuntime | SDK 创建或复用注入对象 | 模型查找、认证、provider 请求能力 | 取决于组合根，不应假定为全局单例 |
| ResourceLoader / SettingsManager | SDK 创建或注入 | 资源定义、当前配置 | 可复用；加载不等于本次已执行 |

这张表也是阅读代码的定位表。看到 `SessionManager.appendMessage`，应回到历史层；看到 `Agent.prompt`，应进入执行层；看到 `before_agent_start`，则仍处于产品请求准备。相同的“session”词根不会消除它们的职责差别。[SDK 构造入口](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/sdk.ts#L191)、[产品 runtime](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session-runtime.ts)。

## 启动时为什么先读历史，再创建执行对象

SDK 的 `createAgentSession` 首先确定 cwd：显式参数优先，其次采用注入 SessionManager 的 cwd，最后才是进程 cwd。这个选择会影响资源和项目规则的解释范围，不能在下层随意重新取一次工作目录。

接着，它采用或创建 ModelRuntime、SettingsManager、SessionManager、ResourceLoader。默认 ResourceLoader 会加载资源。然后调用 `buildSessionContext`，读取当前历史分支，恢复消息和模型／thinking 选择；显式设置、历史选择与默认设置之间按源码优先级决策。这样创建出来的 Agent 才有正确的起点。

最后，SDK 创建 Agent，将执行所需的 model、转换函数、streamFunction 等能力接进去，再把 Agent 和各服务注入 AgentSession。CLI 的 services 路径同样承担组合职责。**组合根的作用是决定对象如何协作，构造时还没有开始模型任务。** [历史读取与配置恢复](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/sdk.ts#L209)、[services 组合](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session-services.ts#L135)、[CLI 入口](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/main.ts#L751)。

下面是 `sdk.ts` 中 `createAgentSession` 的流程骨架，保留真实对象和调用顺序；省略模型选择细节、请求缓存和可选配置，不能独立运行。先看历史消息怎样交给 Agent，再看服务怎样交给 AgentSession：

```ts
const cwd = resolvePath(options.cwd ?? options.sessionManager?.getCwd() ?? process.cwd());
// ... resolve agentDir and credential paths
const modelRuntime = options.modelRuntime ?? (await ModelRuntime.create({ authPath, modelsPath }));
const settingsManager = options.settingsManager ?? SettingsManager.create(cwd, agentDir);
const sessionManager = options.sessionManager ?? SessionManager.create(cwd, getDefaultSessionDir(cwd, agentDir));
let resourceLoader = options.resourceLoader;
if (!resourceLoader) {
  resourceLoader = new DefaultResourceLoader({ cwd, agentDir, settingsManager });
  await resourceLoader.reload();
}
const existingSession = sessionManager.buildSessionContext();
// ... select model and thinkingLevel using options, history and settings
const agent = new Agent({
  initialState: { systemPrompt: "", model, thinkingLevel, tools: [], messages: existingSession.messages },
  convertToLlm: convertToLlmWithBlockImages,
  streamFn: async (model, context, options) => {
    const requestOptions = buildRequestOptions(model, options);
    // ... cache warming
    return modelRuntime.streamSimple(model, context, requestOptions);
  },
  // ... callbacks and queue settings
});
// ... record initial selection metadata
const session = new AgentSession({
  agent, sessionManager, settingsManager, cwd, resourceLoader, modelRuntime,
  // ... tool selections, cache and extension references
});
```

这里创建的是能力连接：`existingSession.messages` 给出执行起点，`streamFn` 指向真正的模型请求服务。只有之后调用 prompt，这些连接才被使用。[SDK 的 Agent 构造](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/sdk.ts#L411)、[AgentSession 注入](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/sdk.ts#L461)。

进入 `AgentSession` 构造函数后，还要把产品行为接到内核边界。下面节选构造函数的绑定段；省略隐藏声明等专门投影 hook：

```ts
this._unsubscribeAgent = this.agent.subscribe(this._handleAgentEvent);
this._installAgentToolHooks();
this._installAgentNextTurnRefresh();
this._installAgentRequestProjection();
this._installAgentBoundaryHooks();
// ... additional projections
this._buildRuntime({
  activeToolNames: this._initialActiveToolNames,
  includeAllExtensionTools: true,
});
if (this._initialActiveToolNames === undefined) this._restoreToolsFromTranscript();
```

订阅负责把执行事件交给产品和历史；tool hooks 负责工具前后处理；request projection 负责请求视图；runtime 负责扩展定义与当前绑定。它们不是四份执行循环，而是同一循环在不同边界调用的产品能力。[构造时的绑定](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session.ts#L511)。

如果程序重启，恢复的是历史和配置，再创建一个新的执行对象；如果用户开始新会话，产品 runtime 可以更换活动 AgentSession。两种动作都不同于在原工具函数的暂停位置继续执行。

## 一个对象如何承接多次任务

以修改导出逻辑为例，第一份输入经过 AgentSession 的产品处理后进入 Agent。Agent 为这次运行创建 activeRun 和 AbortController；循环结束时释放运行状态。随后用户再提交“给这项修改补一段说明”，可以在同一个 AgentSession 和同一条历史上启动新的 activeRun。

如果第二份输入在第一份尚未结束时到达，产品需要选择 steer 或 followUp。它们进入队列，由循环在相应边界消费，不能再启动一份并行 `Agent.prompt`。Agent 的 `isStreaming` 表示整个活跃运行，其间也可能正在执行工具；不能把名字理解为“此刻一定正在接收模型 token”。[运行生命周期与 activeRun](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/agent/src/agent.ts#L507)。

在执行层，`runWithLifecycle` 为一次内核运行认领 `activeRun`，并在最后调用 `finishRun`。下面的节选保留认领与释放位置，省略初始显示状态和异常消息的构造：

```ts
if (this.activeRun) throw new Error("Agent is already processing.");
const abortController = new AbortController();
// ... create promise and resolvePromise
this.activeRun = { promise, resolve: resolvePromise, abortController };
this._state.isStreaming = true;
try {
  await executor(abortController.signal);
} catch (error) {
  await this.handleRunFailure(error, abortController.signal.aborted);
} finally {
  this.finishRun();
}
// finishRun(): clear streaming state, resolve activeRun.promise, clear activeRun
```

因此 activeRun 的终点是内核和 awaited 事件监听者均完成之后。产品层在一次内核运行结束后还可能继续调用 `Agent.continue()`，最终用 `agent_settled` 表达产品收口；完整代码在[循环章](loop.md)展开。不要用一个 `agent_end` 同时代表内核事件终点和整个产品 prompt 已完成。[状态释放](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/agent/src/agent.ts#L550)。

## 哪些状态交给哪一层

| 案例中的事实 | 放在哪里 | 原因 |
|---|---|---|
| 用户要求与模型读到的资料 | 消息与历史条目 | 后续响应需要理解语义 |
| 可调用哪些工具 | 当前工具集合及相应声明 | 请求可见性要与运行可执行集合对应 |
| 本次是否仍在运行、是否要求停止 | Agent activeRun / AbortController | 控制当前进程的执行 |
| 当前历史分支与压缩摘要 | SessionManager | 决定从哪段过去构造下一次上下文 |
| 资料来自哪个 skill、扩展如何介入 | ResourceLoader / ExtensionRunner / AgentSession | 属于产品装配和运行绑定 |

因此，Pi 的分层不是“一个大 Agent 里面再嵌几个小 Agent”。它将语义材料、执行控制和历史视图分开，让同一个循环能够被不同产品入口使用。代价是阅读时必须跟随对象边界：模型调用见[执行章](loop.md)，历史如何变成输入见[上下文章](context.md)，资源怎样绑定见[扩展章](extensions.md)。

读完本章，应能解释两个问题：为什么 SessionManager 不能代替 Agent；为什么恢复会话文件后仍需要重新构造模型与工具运行环境。能回答这两点，再深入循环就不容易把持久记录和活实例混在一起。

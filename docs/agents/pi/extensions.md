---
id: "pi-extensions"
title: "AgentSession：资源、扩展与运行绑定"
subject: "pi-session"
status: "verified-source"
baselines: ["pi-20261009"]
sources: ["pi-session"]
depends_on: ["pi-architecture", "pi-loop"]
evidence: ["source", "historical-document"]
verified_scope: "已静态核验资源加载、注册/激活、prompt 输入 hook、工具 hook 和 reload 的运行绑定；更多资源冲突、TUI 与 MCP 见平台专题，全部 provider 未运行。"
---

# AgentSession：资源、扩展与运行绑定

AgentSession 中的资源层提供定义，ExtensionRunner 提供事件处理，Agent 的 hook 才把它们接到实际模型/工具循环。沿着这三层读，可以避免把“加载了扩展”直接等同于“扩展已参与本次执行”。本章只讨论当前默认会话架构，旧 Lane overlay 不作为本页证据。

![Pi ResourceLoader 加载定义，AgentSession 创建并绑定 ExtensionRunner，prompt 和工具边界在运行时读取当前绑定；reload 使旧上下文失效](../../assets/pi-extensions.svg)

## 概念与所有权

| 名词 | 所属层 / 白话含义 | owner 与生命周期 |
|---|---|---|
| ResourceLoader | 发现与加载资源的门面 | SDK 可注入；默认实现管理资源来源及诊断 |
| extension | 注册工具、命令和事件处理的代码 | 加载时运行工厂，注册到 extension 定义集合 |
| skill / prompt template | 任务知识 / 输入文本模板 | 资源集合提供内容，prompt 阶段展开 |
| ExtensionRunner | 事件分发与当前会话操作门面 | AgentSession 创建并 bindCore；reload 可替换 |
| registered tool | 已进入工具定义集合 | 不必然属于当前模型可见集合 |
| active loadout | 当前选用的工具集合 | AgentSession 更新工具与相应 system prompt |
| extension context | 指向当前会话操作能力的句柄 | session 替换/reload 后旧句柄失效 |

入口 `createAgentSession` 采用注入的 ResourceLoader 或默认实现，构造位置已在[架构章](architecture.md#启动时为什么先读历史-再创建执行对象)展开。本章从资源加载后的结果继续：`AgentSession._buildRuntime` 创建 ExtensionRunner，设置当前引用、绑定会话动作并刷新工具 registry。这里的 `_buildRuntime` 是扩展装配方法，和管理整份活动会话的 AgentSessionRuntime 不同。

DefaultResourceLoader 不把所有资料混成一个字符串，而是保存不同资源集合。下面按 reload 的源码整理，省略路径发现、信任筛选和诊断的展开：

```ts
const extensionsResult = await this.loadFinalExtensionSet(extensionPaths, preTrustExtensions);
this.extensionsResult = this.extensionsOverride
  ? this.extensionsOverride(extensionsResult)
  : extensionsResult;
this.applyExtensionSourceInfo(this.extensionsResult.extensions, metadataByPath);
// 省略：合并启用的 skill 路径，得到 skillPaths。
this.lastSkillPaths = skillPaths;
this.updateSkillsFromPaths(skillPaths, metadataByPath);
// 省略：合并启用的 prompt 路径，得到 promptPaths。
this.lastPromptPaths = promptPaths;
this.updatePromptsFromPaths(promptPaths, metadataByPath);
```

扩展结果中的定义和 runtime 交给 ExtensionRunner；skill 和 prompt 内容则由输入展开阶段消费。资源已加载、定义已注册和本次执行已发生，是三个不同结论。上面的分类保存来自 [ResourceLoader 采用扩展、skill 与 prompt 加载结果](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/resource-loader.ts#L585)，接下来跟随扩展定义进入运行绑定。

## 注册、激活、请求、效果点

| 当前位置 | 入口 → 下层 | 状态及提前结束 |
|---|---|---|
| 资源发现 | DefaultResourceLoader → loadExtensionsCached | 根据来源/启用状态加载，合并 inline factories 与诊断 |
| 定义注册 | extension factory → registerTool | 校验对象参数 schema；保存定义和 sourceInfo；刷新 registry |
| 激活选择 | setActiveToolsByName → _applyToolLoadout | 更新选用集合及 system prompt；不等同执行授权证明 |
| 输入处理 | prompt → extension command / input hook | command 已处理则返回；input hook 可消耗输入 |
| 文本展开 | skill command / prompt template | 处理后的文本形成用户输入；运行中可排到 steer/followUp |
| 请求准备 | before_agent_start、request/context hooks | 允许改变本次请求；主 loop 在后续执行 |
| 工具调用 | Agent.beforeToolCall → 当前 runner.emitToolCall | block 提前返回；异常由调用边界阻止效果继续 |
| 工具完成 | Agent.afterToolCall → 当前 runner.emitToolResult | 可改内容、details、isError 等结果字段 |

表中注册、激活和工具 hook 的对应代码在下面逐段展开；prompt 的命令与输入处理已在[一次输入的产品分派](loop.md#第一步-产品输入先变成可执行的请求材料)展开，prepare/execute/finalize 则在[工具效果路径](loop.md#第二步-一个-turn-怎样从消息走到效果)展开。这样每个链接都承接一个明确的边界，而不是把方法名并排列成另一张目录。

### 定义怎样成为当前运行绑定

先看注册层。下面节选 loader 提供给扩展的 `registerTool` 方法，省略 schema 无效时的错误文案；保存的是定义与来源，还没有执行工具：

```ts
registerTool(tool: ToolDefinition): void {
  assertActive();
  // 省略：检查 parameters 是对象 schema；
  // 无效定义在注册阶段报错。
  extension.tools.set(tool.name, {
    definition: tool,
    sourceInfo: extension.sourceInfo,
  });
  runtime.refreshTools();
}
```

再进入产品层。`AgentSession._buildRuntime` 采用 ResourceLoader 的加载结果，创建 runner 并连接当前会话。下面节选它的装配段，省略默认工具名选择：

```ts
this._extensionRunner = new ExtensionRunner(
  extensionsResult.extensions,
  extensionsResult.runtime,
  this._cwd,
  this.sessionManager,
  new ModelRegistry(this._modelRuntime),
);
if (this._extensionRunnerRef) this._extensionRunnerRef.current = this._extensionRunner;
this._bindExtensionCore(this._extensionRunner);
this._applyExtensionBindings(this._extensionRunner);
// 省略：优先采用显式 activeToolNames，否则采用默认内置工具名。
this._refreshToolRegistry({
  activeToolNames: baseActiveToolNames,
  includeAllExtensionTools: options.includeAllExtensionTools,
});
```

这里的 current 引用和 core/UI 绑定让定义能操作当前产品会话。激活又是另一段：`_setActiveTools` 调用 `_applyToolLoadout`，清除对应 pending 名称，再按实际工具名 `_rebuildSystemPrompt`。因此注册改变可用定义，激活改变当前选择及声明；两者都没有触发 execute。[注册执行点](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/extensions/loader.ts#L289)、[运行装配](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session.ts#L3637)、[激活实现](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session.ts#L1527)。

`bindCore` 又如何把扩展 API 接回产品？下面从它的两个参数对象中选取代表回调，省略其他会话操作和通知字段：

```ts
runner.bindCore({
  sendMessage: (message, options) => {
    // 扩展发消息，实际接回当前 AgentSession 的 custom
    // 消息入口。
    this.sendCustomMessage(message, options).catch((err) => {
      // 省略：runner.emitError 记录 send_message 失败，不把
      // Promise 丢掉。
    });
  },
  appendEntry: (customType, data) => {
    // 扩展状态写入仍由当前 SessionManager 管理，
    // 不另建历史文件。
    const entryId = this.sessionManager.appendCustomEntry(customType, data);
    const entry = this.sessionManager.getEntry(entryId);
    if (entry) this._emit({ type: "entry_appended", entry });
  },
  setActiveTools: (toolNames) => this.setActiveToolsByName(toolNames),
  // 省略：其他消息、模型和会话操作。
}, {
  getModel: () => this.model,
  isIdle: () => this.isIdle,
  getSignal: () => this.agent.signal,
  // 省略：其他运行状态读取与停止操作。
});
```

前一个对象提供动作，后一个对象提供当前状态读取；runner 创建的扩展上下文因此能使用当前会话能力。它们通过闭包回到产品所有者，既没有把 SessionManager 复制给扩展，也没有让扩展拥有另一个 Agent。[AgentSession 将扩展能力绑定到产品动作与状态](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session.ts#L3386)对应这个绑定点。

激活的真实方法只有三步，可以直接看源码：

```ts
private _setActiveTools(toolNames: string[]): void {
  const tools = this._applyToolLoadout(toolNames);
  for (const tool of tools) this._pendingToolNames.delete(tool.name);
  this._rebuildSystemPrompt(tools.map((tool) => tool.name));
}
```

先采用实际 loadout，再移除已经注册的 pending 名称，最后同步 Prompt。这是注册定义走向当前请求材料的交接；模型可见声明仍会在请求边界与可执行集合对齐。[采用当前工具集合与重建 Prompt](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session.ts#L1527)可核对这三步。

## Hook 分发与失败

![Agent 的 beforeToolCall 在实际调用时读取当前 ExtensionRunner，逐个 await tool_call handler；block 结果直接返回并阻止 execute，未拦截才执行工具；之后 tool_result handler 累计修改结果，某个结果 handler 报错会记录错误并继续后续 handler](../../assets/pi-extension-hooks.svg)

`emitToolCall` 按处理器快照逐个 await，遇到 block 直接返回；处理器异常会向调用边界传播。`emitToolResult` 把每次修改累计到 currentEvent，某个 handler 报错时记录 extension error 并继续处理其余结果 hook。两种错误策略不同，不能把“hook 失败”统一写成忽略或中止。

产品安装的 hook 不捕获某一个旧 runner。下面按源码整理绑定与调用段，省略 parentToolCallId 展开和异常文案：

```ts
// 构造时 _installAgentToolHooks() 只安装回调，不触发工具调用。
this.agent.beforeToolCall = (context) => this._beforeToolCall(context);
this.agent.afterToolCall = (context) => this._afterToolCall(context);

// 真正调用 _beforeToolCall 时，再读取当前 runner，避免捕获
// reload 前的旧实例。
const runner = this._extensionRunner;
if (!runner.hasHandlers("tool_call")) return undefined;
return await runner.emitToolCall({
  type: "tool_call", toolName: toolCall.name, toolCallId: toolCall.id,
  // 省略：嵌套调用附上 parentToolCallId，
  // 让扩展知道它属于哪个父工具。
  input: args as Record<string, unknown>,
});
```

`this._extensionRunner` 在调用时读取，这就是 reload 更换 runner 后仍沿同一 Agent hook 生效的原因。[动态读取当前 runner](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session.ts#L652)。

再下到 runner 的事件分发层，`emitToolCall` 的普通处理循环很短，可以直接节选。它依次 await，block 是明确的提前返回：

```ts
const ctx = this.createContext();
let result: ToolCallEventResult | undefined;
for (const { handlers } of snapshotEventHandlers(this.extensions, "tool_call")) {
  for (const handler of handlers) {
    const handlerResult = await handler(event, ctx);
    if (handlerResult) {
      result = handlerResult as ToolCallEventResult;
      if (result.block) return result;
    }
  }
}
return result;
```

结果 hook 的控制不同：`currentEvent` 接收每个 handler 返回的修改，后一个 handler 读到前一个处理后的结果；每次 handler 调用包在 try/catch 中，catch 调 `emitError` 记录错误后继续后续 handler。这个累计对象才决定最后返回哪些结果字段。[前置事件分发](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/extensions/runner.ts#L1242)、[结果事件分发](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/extensions/runner.ts#L1183)。

修改结果 content 而没有同步提供 structuredContent 时，runner 删除原 structuredContent，避免文本与结构内容互相矛盾。依据：[调用 hook](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/extensions/runner.ts#L1242)、[结果 hook](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/extensions/runner.ts#L1183)。这些都发生在进程内，未由此获得 Pico5 的 intent/replay 语义。

## Reload 是运行绑定更换

| 动作 | 保存或失效对象 | 对调用方的影响 |
|---|---|---|
| shutdown event(reason=reload) | 通知旧 runner | 扩展可处理收口事件 |
| oldRunner.invalidate | 旧 context 与操作能力失效 | 不应在 reload 后继续用捕获的旧 ctx/pi |
| settings / resource reload | 重新加载当前资源与配置 | 旧缓存及定义不直接视为当前 |
| _buildRuntime | 新 runner、绑定、工具集合 | Agent hook 在调用时读当前 runner，无须凭旧闭包判断 |
| session_start(reason=reload) | 有绑定时发新生命周期事件 | 后续扩展资源在新绑定中加载 |

证据：[reload](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session.ts#L3660)。当前源码保留 active tool 名称并处理尚未注册的 pending 名称，还允许新加入默认配置的工具进入集合；不把 reload 描述成“全部状态清空重启”。

将表中的动作对照 reload 的源码节选。省略 defaultTools 差异计算及末尾 session_start 事件；保留旧句柄失效、资源重载和新 runner 装配顺序：

```ts
const oldRunner = this._extensionRunner;
const previousFlagValues = oldRunner.getFlagValues();
await emitSessionShutdownEvent(oldRunner, { type: "session_shutdown", reason: "reload" });
oldRunner.invalidate();
// 省略：记下旧默认工具选择，重载后才能识别设置新增的默认工具。
await this.settingsManager.reload();
this.syncQueueModesFromSettings();
resetApiProviders();
await this._resourceLoader.reload();
// 省略：比较前后设置，得到本次新增的默认工具名
// addedDefaultTools。
for (const name of this.getActiveToolNames()) this._pendingToolNames.add(name);
this._buildRuntime({
  activeToolNames: [...this.getActiveToolNames(), ...addedDefaultTools],
  flagValues: previousFlagValues,
  includeAllExtensionTools: true,
});
// 省略：新 runner 重新绑定宿主，并在有运行绑定时发布
// session_start(reason: "reload")。
```

持久历史的 SessionManager 没有在这里被替换。替换的是资源定义及扩展运行绑定；旧 ctx 失效、新工具逐步注册和原历史继续保留可以同时成立。[重载顺序](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session.ts#L3661)。

## 独有内容与边界

扩展可以把 UI 行为、命令和模型工具接在同一会话中，适合交互产品；它们的定义、可见集合与上下文句柄分别维护。TUI、资源冲突、MCP 与 provider 的运行边界见 [平台专题](platform.md)。

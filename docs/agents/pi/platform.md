---
id: "pi-platform"
title: "AgentSession：MCP、codemode、资源冲突与终端宿主"
subject: "pi-session"
status: "verified-source"
baselines: ["pi-20261009"]
sources: ["pi-session"]
depends_on: ["pi-extensions", "pi-context"]
evidence: ["source"]
verified_scope: "核验资源冲突诊断、MCP 重连与 codemode 嵌套执行；TUI/认证按当前入口整理，未执行终端或登录流程。"
---

# AgentSession：MCP、codemode、资源冲突与终端宿主

Pi 默认产品仍以 AgentSession 为运行边界；MCP、codemode、资源和终端是它的能力与宿主层。它们不因名字带“runtime”就成为另一个持久执行引擎。

![资源加载进入 ExtensionRunner 与工具注册；MCP 连接提供工具；codemode 脚本经上下文 executeTool 进入同一工具管线；终端只观察和控制](../../assets/pi-capabilities.svg)

| 概念 | 所属层 / owner | 创建和消费 | 生命周期 |
|---|---|---|---|
| ResourceLoader | 发现与诊断 | SDK/CLI 注入，AgentSession 消费 | reload 重新扫描；冲突规则按资源类型 |
| MCP connection | 外部能力连接 | 内置 MCP extension 构造 server connections | 会话开始后台连接，调用可重连；关闭停止连接 |
| codemode | 工具组合 | extension tool 创建受限 JS sandbox | 一次脚本执行；嵌套工具仍经 AgentSession |
| ModelRuntime / provider auth | 模型和凭证 | 组合根配置，模型请求消费 | OAuth refresh 与模型选择不同职责 |
| TUI Component / screen | 显示宿主 | interactive mode 订阅事件并绑定 UI | 不拥有会话存储或工具副作用 |

## 资源冲突不是统一拒绝

PromptTemplate 和 Theme 按名字保留先出现项并产生 collision diagnostics。扩展 tools/flags 冲突记入 errors，但保留 extensions，最终 precedence 由加载/注册顺序处理。命令、Skill、资源路径和可替换内置扩展有各自规则，因此重名的处理需要按资源类型判断，并非整个插件一律加载失败。诊断必须让维护者看见来源与采用项。

`reload` 会重建 runner 与运行绑定，旧引用失效；保存 active tool 名并不让旧插件对象继续拥有 UI/会话。注册、激活、模型可见和执行门禁的区别见 [扩展章](extensions.md)。证据：[扩展冲突诊断](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/resource-loader.ts#L795)、[Prompt/Theme 去重](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/resource-loader.ts#L1160)。

只看两段短路径就能理解这种区别。下面按 `dedupePrompts` 的源码节选名字采用规则，省略 collision 对象的来源字段：

```ts
const seen = new Map<string, PromptTemplate>();
const diagnostics: ResourceDiagnostic[] = [];
for (const prompt of prompts) {
  const existing = seen.get(prompt.name);
  if (existing) {
    // ... diagnostics.push({ type: "collision", winnerPath, loserPath, ... })
  } else {
    seen.set(prompt.name, prompt);
  }
}
return { prompts: Array.from(seen.values()), diagnostics };
```

而 `addExtensionConflictDiagnostics` 只是调用 `detectExtensionConflicts`，逐项 `extensionsResult.errors.push({ path: conflict.path, error: conflict.message })`；没有从 `extensionsResult.extensions` 删除整个扩展。前者选用一个定义，后者记录冲突，两种控制动作不能混成“发现重名后一律拒绝”。[Prompt 采用规则](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/resource-loader.ts#L1160)。

## MCP：连接、曝光、调用

当前配置支持 direct、deferred、codemode 工具曝光。direct 给模型 schema；deferred 经 tool_search 披露；codemode 由脚本搜索并调用。曝光影响模型怎么发现工具，不能当作执行授权。SDK 不自动加载 CLI 内置 extensions，MCP/codemode/tool-search 要显式加入 ResourceLoader。

会话开始后台连接 enabled server，首次 prompt 等待相关准备。工具调用经 MCP tool → McpServerConnection.callTool → withClient → McpClient，再由 stdio / Streamable HTTP 等 transport 完成协议。OAuth 的 server 业务授权与模型 OAuth、TLS 链路加密不同。

这条路径可以分成“会话准备”和“真正调用”两层。下面是 MCP extension 生命周期处理器的流程骨架，省略配置合并、状态通知和连接错误处理：

```ts
pi.on("session_start", (_event, ctx) => {
  const loaded = (options.loadConfig ?? defaultLoadConfig)(ctx);
  // ... combine configured and extension-registered servers
  ensureDiscoveryActive(ctx);
  const enabled = servers.filter(isEnabled);
  if (enabled.length === 0) { reportProblems(ctx); return; }
  const runtime = new Promise((resolve) => setImmediate(resolve)).then(() => loadMcpRuntime());
  pending = Promise.all(enabled.map((server) => startConnection(server, runtime)));
  // ... observe completion and update server state
});
pi.on("before_agent_start", async (event, ctx) => {
  await waitForDirectServers(ctx);
  const { sections } = event.systemPromptOptions;
  const section = renderServersSection(servers);
  if (section) sections[MCP_SERVERS_SECTION] = section;
  else delete sections[MCP_SERVERS_SECTION];
});
```

session_start 发起后台准备，before_agent_start 等待 direct 工具需要的 server；deferred/codemode 的发现和调用入口再等待相应连接。因此“后台连接”不等于第一次任意模型请求都等所有服务器。[连接起点](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/extensions/mcp/index.ts#L1111)、[请求前的等待](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/extensions/mcp/index.ts#L1175)。

工具定义注册时提供 `getClient`，在 execute 时再取得当前连接。下面节选 `createMcpToolDefinition` 的 execute，省略进度回调：

```ts
async execute(_toolCallId, params, signal, onUpdate) {
  const client = await options.getClient();
  const result = await client.callTool(tool.name, (params ?? {}) as Record<string, unknown>, {
    signal, timeoutMs: options.timeoutMs,
    // ... onProgress translates progress into onUpdate
  });
  return convertMcpResult(server, tool.name, result, {
    readableResources: options.readableResources?.(),
  });
}
```

这里名为 client 的对象实现 `McpToolCaller`，在这条产品装配路径中是 `McpServerConnection`。它的下一层委托只有一行：

```ts
callTool(name: string, args: Record<string, unknown>, options: McpRequestOptions): Promise<CallToolResult> {
  return this.withClient((client) => client.callTool(name, args, options));
}
```

内层 client 才是实际协议客户端 `McpClient`。`withClient` 管连接取得和重连，协议 client 将调用交给 transport。这样可以在工具执行时采用替换后的连接，而不是永远使用工具注册时捕获的旧连接。[执行时连接查找](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/extensions/mcp/index.ts#L425)、[工具 execute](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/extensions/mcp/tools.ts#L281)、[连接委托](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/extensions/mcp/runtime.ts#L265)。

withClient 对标记 readOnly 的 transient HTTP 错误允许一次重试；tool effect 不因此盲目重试。MCP session expired 分支因服务端不再认识该会话而用新会话重试一次，和“结果未知仍重放”不同。needs-auth 会更新状态并要求登录，不能把断线都归为没有权限。

证据：[当前配置/曝光与 SDK 说明](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/docs/mcp.md#L189)、[调用和重试边界](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/extensions/mcp/runtime.ts#L265)、[MCP OAuth](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/extensions/mcp/oauth.ts)。

## codemode：脚本的权限来自可调用工具

模型给 raw JavaScript，执行工具在 QuickJS sandbox 运行异步脚本；没有 Node、文件系统或直接网络 API。宿主提供 tools / store / model globals。脚本通过 ctx.executeTool 调嵌套工具，携带父调用身份并产生结果；MCP 的 tool_call/tool_result hooks 仍作用于嵌套调用。脚本环境限制并不撤销底层工具已获准的文件或网络权限。

工具含 outputSchema 且有 structuredContent 时返回结构化值，否则文本/错误按 outcome 转换。脚本失败前已经运行的工具效果不会回滚；store 的会话分支数据与 JS 局部变量也不是同一持久性。证据：[脚本到 executeTool](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/extensions/codemode/execute.ts#L416)、[codemode 运行说明](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/docs/codemode.md)。

调用链先从脚本宿主看：`executeCodemode` 把会话允许的工具包装为 sandboxTools。下面保留真实调用入口，省略调用记录、计时和脚本返回值转换细节：

```ts
const callable = ctx ? getCodemodeCallableTools(ctx.tools) : [];
// ... render callable tool declarations
const sandboxTools: CodemodeTool[] = callable.map((tool) => ({
  name: tool.name,
  description: samples.get(tool.name),
  execute: async (args, { signal: callSignal }) => {
    // ... record the nested call and publish its running state
    if (!ctx) throw new Error("Tool calls need a session");
    const outcome = await ctx.executeTool(tool.name, args, { signal: callSignal });
    // ... record success/error and publish the outcome
    return toScriptValue(tool, outcome);
  },
}));
// ... construct CodemodeSandbox with sandboxTools and execute the script
```

再跨到产品层：`ctx.executeTool` 进入 `AgentSession._executeNestedToolCall`。其 NestedToolCallRunner 在分派单次调用时执行下面的共享管线，省略寻找 assistantMessage 和事件记录的步骤：

```ts
return runToolCall(toolCall, {
  tools: this._getCallableTools(),
  assistantMessage,
  context: { messages: this.agent.state.messages, tools: this.agent.state.tools },
  beforeToolCall: (context) => this._beforeToolCall(context, parentId),
  afterToolCall: (context) => this._afterToolCall(context, parentId),
  signal,
  onUpdate,
});
```

这就是“嵌套调用仍经过同一工具管线”的代码依据：共享 `runToolCall` 会准备和校验参数、执行 before/after hooks，并调用真实工具。sandbox 的 JS 局部变量不拥有文件权限，权限和效果来自这些工具。[sandbox 包装](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/extensions/codemode/execute.ts#L441)、[嵌套调用接回管线](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session.ts#L748)、[共享调用实现](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/agent/src/agent-loop.ts#L811)。

## 终端、认证与平台

TUI 使用 Component/Container、布局、输入与 renderer 分层，main-screen 与 alt-screen 是显示策略；不能据 UI 支持分支/恢复推断两种 screen 有不同 Agent 存储。主屏关注终端滚动历史，备用屏关注受控视口；它们都消费产品事件。[组件与屏幕导出](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/tui/src/index.ts)、[交互渲染宿主](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/modes/interactive/tui-renderer.ts)。

宿主与运行的连接可以直接看 `InteractiveMode.subscribeToAgent`；这是源码方法，未展开 handleEvent 的渲染分支：

```ts
private subscribeToAgent(): void {
  this.unsubscribe = this.session.subscribe(async (event) => {
    await this.handleEvent(event);
  });
}
```

这里的 session 是产品 AgentSession，UI 取得事件再更新显示；它没有创建第二个 agent-loop，也没有把终端屏幕内容当成会话历史。[终端订阅入口](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/modes/interactive/interactive-mode.ts#L3400)。

模型 provider 决定 API 请求协议与响应事件，auth 模块决定 API key/OAuth 获取/刷新；ModelRuntime 组合二者。新增 provider 要同时检查发现、凭证、stream、usage、tool result 与错误路径，不能只加模型名称。模型名称进入目录，只完成发现；请求协议、认证、响应解析和工具结果接回循环后，才形成完整调用链。

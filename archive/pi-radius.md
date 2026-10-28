<title>Radius 机制与源码边界：Pi 远程接入、复用与恢复</title>

本文聚焦Lane Harness相关的Radius Session Relay：它如何让远程Client访问本机Pi Server、如何在一条host WebSocket上复用多条逻辑连接、断线后恢复到什么程度，以及公开源码覆盖到哪里。Radius同时还是Pi的模型网关和认证入口，本文会说明两者关系，但不会把不同协议混为一谈。

<callout emoji="💡">
**适用基线：**Pi仓库 main 分支提交 `6671c604766b3670ed95f405aa7856835d0ca702`，核验日期 2026-09-17。Session Relay仍属于experimental链路。
</callout>

# 先给源码结论

**Radius不是只有概念。**Pi侧已经有可运行的公开源码：Server侧 `RadiusRelayHost`、Client transport、二进制复用帧、认证解析、指数退避重连、重新attach，以及FakeWebSocket单元测试都在当前仓库。

**但外部Gateway服务端源码没有在公开范围内找到。**截至核验日：

- Earendil Works公开GitHub组织仓库列表中没有Radius或Gateway服务端仓库。
- GitHub公开代码搜索 `pi-session-relay.host.v1`和 `/v1/session-relays/`只命中Pi仓库及其fork中的客户端/host实现。
- 公开npm包 `@earendil-works/pi-radius`提供模型provider、web search和Radius API接入，但它指向的 `pi-extensions`仓库公开链接不可访问，且不包含可验证的Session Relay Gateway服务实现。

因此可审慎下结论：**Pi集成侧开源；`radius.pi.dev`网关内部实现目前没有公开源码证据。**这不能证明它在法律或组织意义上“一定闭源”，只能证明公众无法从现有资料审计其服务端实现。

# Radius在Pi体系里的两个角色

| 角色 | 协议入口 | 用途 | 与Harness关系 |
|-|-|-|-|
| 模型与API Gateway | HTTP、OAuth、`pi-messages`、`/v1/config`等 | 模型目录、模型请求、OAuth、web search、artifact等 | 可作为Worker中模型Provider，但不是Harness transport |
| Session Relay | `wss://.../v1/session-relays/<serverId>/connect` | 让远程Client与本机Pi Server交换有序字节 | 为Lane Harness远程访问提供可选transport |

两者共享Radius gateway地址和认证凭证解析，但应用协议不同。看到“Radius”时应先问是在调用模型，还是在中继Pi Session连接。

# 进程与组件关系

> 图示重建说明（私人画板已移除）：将 Radius Gateway 画为外部节点，RadiusRelayHost 放在 Server 进程内；远程 Client 经 Gateway 接入 Server，本地 Coordinator 路径单独保留。

图中Radius Gateway是外部节点；`RadiusRelayHost`只是Server进程内组件。远程链路不经过本地Coordinator。Coordinator仍服务本地Unix入口和Server generation切换，两者不是对等替代关系。

# 主线：远程Client如何访问一个Session

1. Pi Server启动后创建 `RadiusRelayHost`。它每次连接前重新解析显式或已存储Radius凭证，没有凭证时报告 `not_authenticated`，但不影响本地Server。
2. Host连接 `/v1/session-relays/<serverId>/connect`，携带Bearer token并要求子协议 `pi-session-relay.host.v1`。
3. 远程Client用同一URL和逻辑 `serverId`连接，要求 `pi-session-relay.client.v1`。Gateway负责把它配对到在线host。
4. Gateway在host控制通道发 `connection_open`和UUID connection ID。Host为该ID创建一个 `RelayServerByteConnection`，交给同一个 `Server.accept()`。
5. Client先完成Pi Protocol hello并校验服务端返回的逻辑 `serverId`。之后通过Server Service列Session或attach选定Session。
6. Server生成新的公开attachment ID；后续Session请求携带 `{serverId, sessionId, attachmentId}`，再由Server路由到Session Worker。
7. Chord ServiceCall作为Pi request的严格JSON payload进入Worker；Radius只看到有序字节，不需要理解Lane、tool或transcript。

# 一条host连接如何承载多个Client

> 图示重建说明（私人画板已移除）：在一条 host WebSocket 上区分文本控制帧和带 connection ID 的二进制帧；每个 connection ID 对应独立 ByteConnection，Client 侧收发原始 Pi 字节。

Host WebSocket上的消息分两类：

- **文本控制帧：**JSON version 1，包含 `ping`、`pong`、`connection_open`和 `connection_close`。
- **二进制数据帧：**18字节头加payload。第1字节是frame version，第2字节是data type，接着16字节UUID connection ID，剩余部分是不解释的Pi transport字节。

Gateway通过connection ID把Client连接复用到host WebSocket；Host再把每个ID还原为独立ByteConnection。Client侧不需要复用头，它收到和发送的就是单条Pi连接的原始字节。

## 有序写与背压

`OrderedWebSocketWriter`用Promise tail保证同一socket上的send顺序，复制传入buffer避免调用方后续修改。待发送字节总量上限为Pi默认最大frame的4倍；WebSocket `bufferedAmount`超过1 MiB时轮询等待下降。超过pending上限会拒绝，而不是无限占用内存。

# 认证与地址

- 默认gateway来自 `DEFAULT_RADIUS_GATEWAY`，当前为 `https://radius.pi.dev`；配置可覆盖为自建兼容gateway。
- HTTP地址自动转换为ws，HTTPS转换为wss；其他scheme被拒绝。
- 每次host或client尝试连接都重新resolve credential，使OAuth token刷新可以生效。
- WebSocket升级带 `Authorization: Bearer ...`，并检查服务端实际选中的subprotocol必须等于请求值。
- 逻辑地址是 `radius://<serverId>`；它不是机器IP，也不包含Session ID。Session选择仍发生在Pi attachment协议内。

# 断线、重连与恢复到哪里

> 图示重建说明（私人画板已移除）：分开 Host 重连与 Client 重新 attach：旧连接关闭后建立新连接、attachment 和订阅 snapshot；旧 request、pending Promise 与请求重放不自动恢复。

## Host侧

Host断线会关闭该WebSocket承载的所有逻辑ByteConnection，并通知Pi Server连接终止。随后从1秒开始指数退避，最大30秒。重新连上Gateway只恢复“这个serverId有host在线”，不会复活旧connection ID。

## Client侧

`RadiusClientReconnect`观察Pi Client连接状态，保存最后一个非空attachment的sessionId。断线后先等待，再调用 `client.reconnect()`；成功后通过应用提供的回调重新attach该sessionId。新的连接会得到新的Pi attachment ID和新的Service订阅snapshot。

## 不会自动恢复的内容

- 旧request ID和本地pending Promise不会迁移到新连接。
- Pi Client明确不自动重放请求；调用者必须确认操作可安全重试。
- 旧attachment和Chord subscription不会复用，必须重新attach和hydrate。
- Radius transport断线不等于Lane Operation取消。Worker若仍在运行，Agent可能继续并写入JSONL。

# 故障边界与可用性

| 故障点 | 影响范围 | 现有机制 | 仍未知或缺失 |
|-|-|-|-|
| 单个远程Client断开 | 一个logical connection | connection_close、Pi attachment释放、Client重连 | 请求是否可重试由业务决定 |
| Host WebSocket断开 | 该Server所有远程logical connections | 全部drop，Host自动重连 | 没有无损connection迁移 |
| Gateway不可达 | 远程入口不可用，本地Unix仍可用 | 指数退避与状态提示 | Gateway多活、区域容灾和SLA没有公开证据 |
| Server generation替换 | 旧RadiusHost关闭，远程连接重建 | 新Server用相同serverId重新注册host；Client reconnect后attach | 切换期间不是无缝 |
| Worker崩溃 | 单个Session | 与Radius无关，由Harness从JSONL恢复 | Radius不持久化Lane状态 |

# 安全边界

- Gateway认证依赖Bearer token；Pi公开源码不包含Gateway端的token校验和授权策略，不能从客户端代码推断租户隔离实现。
- Pi Protocol握手再次验证逻辑 `serverId`，Session请求还必须匹配live attachment，避免仅靠物理WebSocket地址路由。
- Radius relay保持字节透明；Pi Protocol在内层校验CBOR frame大小、层级、字段和严格JSON。
- Host控制消息严格校验version、type、UUIDv4 connection ID和close code；非法消息关闭连接。
- 源码没有端到端加密覆盖Gateway不可见性的证据。TLS保护传输，但Gateway是否能够读取Pi字节取决于部署和协议实现；不要宣称其为零知识中继。

# Gateway是不是单点

从**逻辑协议**看，一个Client和一个Host都连接到一个gateway URL，Gateway是这条远程路径的会合点；它不可用时远程连接无法建立。从**物理部署**看，公开Pi源码无法证明这个URL后面是单实例、负载均衡集群还是多区域系统。因此只能说“逻辑单入口、物理拓扑未知”，不能画成一个已确认的单进程节点。

# 源码与公开证据覆盖

| 能力 | 公开证据 | 结论 |
|-|-|-|
| Pi Host relay | `packages/coding-agent/src/experimental/radius-relay.ts` | 已开源实现 |
| Pi Client transport与reattach | 同文件及 `client-runtime.ts` | 已开源实现 |
| 认证解析 | `radius-auth.ts`和 `packages/ai/src/auth/oauth/radius.ts` | 客户端部分已开源 |
| 协议测试 | `experimental-radius-relay.test.ts` | 复用帧、host/client连接和重连有测试 |
| Gateway Session Relay服务端 | 公开组织仓库与代码搜索无命中 | 未找到公开源码 |
| Gateway持久化和HA | Pi仓库只定义在线WebSocket契约 | 实现未知，不应推断 |

# 对其他系统的可复用性

Pi侧Radius relay实现不是完整通用框架，但包含可迁移的模式：一个长连接host注册逻辑服务身份，Gateway把多个临时client连接复用为带connection ID的二进制流，host再适配成应用ByteConnection。适合NAT后的开发工具、远程IDE或设备控制。

若抽离复用，仍需自行定义并实现：

- Gateway端注册、认证、租户隔离、限流和在线路由。
- host身份冲突和generation接管规则。
- connection迁移、跨Gateway恢复、审计和SLA。
- 内层应用协议、授权、请求幂等和持久状态。

Chord可以复用远程Service语义，Radius式relay可以复用字节transport形态，但两者仍需要一个应用adapter把ServiceCall封装进具体请求协议。

# 源码与外部资料索引

- `packages/coding-agent/src/experimental/radius-relay.ts`：Session Relay host、client、frame和重连。
- `packages/coding-agent/src/experimental/radius-auth.ts`：每次连接的credential解析。
- `packages/coding-agent/src/experimental/client-runtime.ts`：Unix与Radius transport选择及reattach。
- `packages/coding-agent/src/experimental/server.ts`：RadiusRelayHost在Server generation中的生命周期。
- `packages/coding-agent/test/experimental-radius-relay.test.ts`：公开行为测试。
- `packages/ai/src/providers/radius.ts`、`radius-config.ts`：Radius模型Gateway，和Session Relay不同。
- [Earendil Works公开GitHub组织](https://github.com/earendil-works)
- [Pi公开Radius Relay源码](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/experimental/radius-relay.ts)
- [公开npm Radius扩展包](https://www.npmjs.com/package/@earendil-works/pi-radius)
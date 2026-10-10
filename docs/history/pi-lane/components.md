---
id: "pi-components-migrated"
title: "Chord 与 Radius：保留的独有专题"
subject: "pi-lane"
status: "migrated-unverified"
baselines: ["pi-lane-20260916"]
sources: ["pi-chord", "pi-radius"]
depends_on: []
evidence: ["historical-document"]
verified_scope: "两份独有专题已消化分层；当前 Chord 与 Radius 外部服务情况未刷新。"
---

# Chord 与 Radius：保留的独有专题

两个组件在旧远程链路中承担不同层的职责。Chord 是组合与 Service 语义，Radius Session Relay 是可选 transport；它们都不是 Lane 执行器。

| 概念 | 旧文职责与层次 | 边界 |
|---|---|---|
| Chord Host / Facet | 进程内组合、依赖校验、激活和逆序释放 | 不监听端口，不管理插件安装 |
| Service | 稳定身份连接 provider 与 consumer | singleton / keyed 的声明与远程契约 |
| ReplicatedState | 权威状态的 Snapshot + Update 复制 | 重连先 hydrate，不自动重放应用 mutation |
| Context | 调用取消与本地携带值 | 不把控制数据序列化成业务参数 |
| Radius 模型网关 | 模型/API、认证入口 | 不等同 Session Relay |
| Radius Session Relay | host WebSocket 复用逻辑连接、传输字节 | 不理解 Lane、tool 或 transcript |

旧远程路径先连接与协议 hello，再列出/选择 session，attach 到 Worker，绑定 Chord Service，最后提交产品命令。连接成功不等于业务执行成功；断线后新 attachment 与 snapshot 不意味着旧请求自动重放。

旧材料对 Radius 外部 Gateway 的边界是“当时没有公开源码证据”，不是证明永久闭源。本页不重新验证 2026-10-09 的外部服务公开状态。

Chord 在 Pico5 中仍有用，但 tracked Document 与旧手工视图桥不能直接混称同一种接口；刷新当前 Chord 专题时须重新核验 packages/chord 与 durable 的使用点。

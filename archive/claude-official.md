<title>Claude 官方文档研究：Claude Code 最佳实践与 Agent 架构范式</title>

<callout emoji="📌">
**研究目标**：系统扫描 Claude 官方文档，沉淀两类高价值信息：一是作为 **Claude Code 使用者** 能直接落地的工作方法；二是作为 **Agent 开发者** 可直接复用的架构优化与开发范式。
- 扫描范围：`code.claude.com/docs/zh-CN`、`platform.claude.com/docs/zh-CN`、`managed-agents` 相关页面
- 输出原则：优先保留可执行结论，不做泛泛摘抄；对每个结论给出适用场景、原因和来源
- 阅读建议：先看“一页结论”和“立即可用清单”，再按主题下钻
</callout>

# 一页结论

| 对象 | 最值得先落地的动作 | 为什么优先 |
|-|-|-|
| Claude Code 使用者 | 1. 每次任务都给验收标准  <br/>2. 复杂任务先 Plan Mode  <br/>3. 把重复纠正沉淀进 CLAUDE.md | 这三项同时作用于结果质量、返工率、上下文稳定性，收益最大 |
| Agent 开发者 | 1. 把 prompt / tools / runtime / session 分层设计  <br/>2. 用详细 tool description 约束模型决策  <br/>3. 主动做 context compaction 与缓存策略 | Anthropic 文档里最稳定的模式不是某个单技巧，而是这套分层与运行时治理方法 |
| 需要长期运行的 Agent | 优先参考 Managed Agents 的环境、会话、事件、确认流和 checkpoint 设计 | 官方已经把长任务、异步执行、状态保持、工具确认、性能优化都产品化了 |

<grid>
<column width-ratio="0.500000">
<callout emoji="✅">
**官方明确推荐**
- 复杂任务先规划再实现
- 给模型明确的成功标准
- 长上下文场景主动治理 context
- Tool schema 的描述要足够详细
</callout>
</column>
<column width-ratio="0.500000">
<callout emoji="🧠">
**高置信归纳**
- Anthropic 的 Agent 方法论核心是“分层 + 状态机 + 受控工具”
- 上下文不是越大越好，关键是压缩、缓存、隔离和引用
- Claude Code 的最佳实践，本质上也是通用 Agent 工程实践
</callout>
</column>
</grid>

---

# 一、作为 Claude Code 使用者：可直接拿来用的最佳实践

<callout emoji="💡">
这一部分只保留“今天就能改掉自己工作流”的东西。Anthropic 官方文档反复强调的主线是：**把任务说明得更清楚、把验证条件讲明白、把长期规则从对话里迁到持久配置里**。
</callout>

## 1. 任务描述与验收标准

| 实践 | 适用场景 | 为什么有效 | 怎么用 |
|-|-|-|-|
| 给出明确验收标准 | 功能开发、修 bug、重构、UI 改动 | Claude 对“怎么证明完成”极其敏感；标准越清楚，返工越少 | 把测试用例、预期输出、截图对比、边界条件直接写进提示 |
| 提示里指明文件、目录、约束和参考实现 | 多文件修改、陌生模块、业务逻辑迭代 | Claude 可以推断，但不会读心；明确边界能减少跑偏 | 直接引用 `@src/...`、`@tests/...`、相关 URL 或截图 |
| 报 bug 时给复现方式和错误信息 | 构建失败、测试失败、线上问题复盘 | 能引导 Claude 先定位根因，而不是做表层修补 | 给命令、日志、错误栈，并明确“修根因，不要只压错误” |
| UI 任务附设计图并要求截图比对 | 页面改版、组件视觉微调 | 视觉任务主观性高；截图比对能显著提升对齐度 | 提供截图、目标参考图，并要求 Claude 对比差异 |

## 2. 复杂任务先规划，再进入执行

<grid>
<column width-ratio="0.500000">
<callout emoji="✅">
**推荐触发条件**
- 要跨多个文件或模块修改
- 你自己都不确定改法
- 任务有明显探索成本
- 需要先理解代码库再落方案
</callout>
</column>
<column width-ratio="0.500000">
<callout emoji="💡">
**不必强行 Plan 的情况**
- 单文件、低风险、小步修补
- 你已经清楚知道最终 diff
- 只是查信息或解释代码
</callout>
</column>
</grid>

| 动作 | 官方建议 | 落地做法 |
|-|-|-|
| 先进入 Plan Mode | 复杂问题先探索与规划，再实施 | 先让 Claude 读代码、理解现状、列计划，再审查和细化 |
| 把研究与编码分开 | 先分析代码库和约束，再开始改代码 | 用一轮对话只做理解和计划，下一轮再做实现 |
| 把 Claude 当同事去委派，而不是写死每个微步骤 | 给上下文和方向，让模型决定工具和顺序 | 告诉它目标、约束、成功标准，少做机械式手把手 |

## 3. 上下文管理：别把上下文窗口当无限资源

| 实践 | 适用场景 | 价值 | 建议动作 |
|-|-|-|-|
| 长会话主动清上下文 | 调试、大仓库探索、长链路开发 | 减少 context rot，避免早期要求被压缩丢失 | 任务切换时用 `/clear`，主题偏移时用 `/compact` |
| 上下文直接喂原始材料 | 日志分析、文件审查、文档引用 | 比口头转述更省 token，也更少歧义 | 优先用 `@文件`、URL、截图、管道输入 |
| 用 subagent 隔离调查任务 | 读很多文件、日志很多、需要先研究再汇报 | 主对话只保留摘要，避免主上下文膨胀 | 把“先研究认证流程再回来汇报”这类任务委派出去 |
| 路径规则分层加载 | 大仓库、多语言、多团队约束 | 减少无关规则进入当前上下文 | 将规则拆到 `.claude/rules/` 并基于路径生效 |

## 4. 让规则持久化：CLAUDE.md、自动记忆、局部规则

| 做法 | 什么时候该做 | 注意点 |
|-|-|-|
| 仓库初次接入先跑 `/init` | 新项目第一次用 Claude Code | 先生成初稿，再人工删掉泛化内容，只保留长期稳定规则 |
| 把重复纠正写进 `CLAUDE.md` | 同一提醒出现第二次 | 不要一直靠聊天重复教育模型 |
| 控制 `CLAUDE.md` 长度 | 文档变得越来越长时 | 官方建议控制在约 200 行内，避免吞掉太多上下文 |
| 个人偏好写进 `CLAUDE.local.md` | 你不想把个人习惯提交到团队仓库 | 适合本地偏好、工具习惯、输出风格要求 |

## 5. 权限、会话与 worktree：把并行开发做稳

| 主题 | 推荐模式 | 原因 |
|-|-|-|
| 编辑权限 | `acceptEdits` 适合迭代开发；高风险任务用 `default` 或 `plan` | 减少低价值批准噪音，同时保留对危险操作的控制 |
| 自动模式 | 只在你信任总体方向时使用 | 官方仍将其定位为研究预览，不应替代生产变更审查 |
| 会话管理 | 恢复同一会话用 continue；需要试不同路线时 fork | 避免不同终端往同一会话文件里交错写入 |
| 并行开发 | 不同任务用独立 worktree | 防止多个 Claude 会话互踩文件和 git 状态 |
| 本地配置复制 | 为 ignored 文件配置 `.worktreeinclude` | 避免新 worktree 启动就缺 `.env` 等本地依赖 |

## 6. 把“建议”升级成“确定性动作”：hooks、MCP、subagents

<grid>
<column width-ratio="0.333333">
<callout emoji="🔧">
**Hooks**
- 适合必须每次都触发的动作
- 例如编辑后格式化、阻止改敏感文件、任务完成提醒
</callout>
</column>
<column width-ratio="0.333333">
<callout emoji="🔌">
**MCP**
- 适合接外部系统和自定义工具
- 例如读设计文档、更新 Jira、查外部数据
</callout>
</column>
<column width-ratio="0.333333">
<callout emoji="💡">
**Subagents**
- 适合调查、审查、并行分析
- 主对话只收摘要，不带走全部过程
</callout>
</column>
</grid>

| 能力 | 直接建议 | 常见例子 |
|-|-|-|
| Hooks | 至少配通知、编辑后格式化、敏感文件保护三个高价值 hook | PostToolUse 自动格式化；PreToolUse 阻止动生产配置 |
| MCP | 用 MCP 扩 Claude 的数据访问面，不要靠模型臆测外部事实 | 连接 Drive、Jira、Slack、自建系统 |
| Subagents | 为调查型任务收紧工具与权限，按任务类型选更轻模型 | 代码审查 agent、只读研究 agent、长日志分析 agent |

---

# 二、作为 Agent 开发者：Claude 已经实施过的架构优化与范式

<callout emoji="💡">
Anthropic 文档里最值得抄的不是“某个 prompt 技巧”，而是这套工程模式：**用 prompt 定义意图，用 tool schema 约束动作，用 environment 和 permission policy 控制执行面，用 session 和 events 管状态，用 compaction / caching / spillover 管成本**。
</callout>

## 1. Prompt 设计：不是写得多，而是层次清楚

| 模式 | 核心结论 | 落地建议 |
|-|-|-|
| 清晰直接 | Prompt 首先要明确输出格式、约束和顺序 | 把结构、边界、禁止项写清楚，避免留太多解释空间 |
| 带上“为什么” | 说明目标和动机，比只给字面指令更容易对齐真实意图 | 系统提示里写明角色和目标，例如 reviewer、researcher、builder |
| XML 分层 | 复杂 prompt 用 `instructions / context / input / examples` 分段 | 长提示和多文档任务里，显式标签能减少解析歧义 |
| Few-shot | 3 到 5 个高相关示例仍是最稳的输出控制方法之一 | 覆盖正常样例和边界样例，示例格式要与目标输出一致 |

## 2. 长上下文策略：重点不是塞更多，而是防 context rot

| 策略 | 官方信号 | 工程启发 |
|-|-|-|
| 长文档在前，问题在后 | 多文档任务质量可显著提升 | 输入顺序会影响检索与注意力分配 |
| 先引用再回答 | 让模型先定位相关片段，再生成结论 | 检索型 Agent 不应直接对大上下文自由发挥 |
| Server-side compaction | 官方明确建议长运行 Agent 主动压缩上下文 | 上下文管理应是 runtime 能力，不只靠 prompt 自觉 |
| Thinking 块自动剥离 | 旧 thinking 不会无限累积，但工具回合要原样回传 | 对多轮 tool use 系统，消息编排要保留协议完整性 |

## 3. Tool 设计：Anthropic 对“工具面”要求非常严格

| 原则 | 解读 | 设计建议 |
|-|-|-|
| 详细 description | 工具描述不是文档装饰，而是模型决策约束 | 至少写清用途、何时用、何时不用、参数含义、限制条件 |
| 工具面不要碎片化 | 相关动作要合并成更少但更强的工具 | 按领域做命名空间，避免几十个微型工具打散决策 |
| 返回值要高信号 | 不要把一堆低价值字段塞回模型 | 优先返回稳定 ID、关键摘要、下一步所需上下文 |
| 复杂输入给 examples | 嵌套参数、格式敏感输入要用 input_examples 辅助 | 把最常见、最容易错的调用形式样例化 |
| tool_choice 是强约束 | `auto / any / tool / none` 会直接改变 agent 行为 | 不要把它当普通偏好开关；注意和 thinking 的兼容性 |

## 4. 运行时分层：Agent / Environment / Session / Events

| 层次 | 职责 | 为什么值得参考 |
|-|-|-|
| Agent | 模型、system prompt、tools、MCP、skills 的能力定义 | 可复用、可版本化，便于灰度、回滚和稳定发布 |
| Environment | 容器模板、预装包、网络策略、挂载资源 | 把“运行条件”从业务逻辑里抽离出来，提升可复制性 |
| Session | 一次有状态执行实例 | 适合长任务、异步任务、断点恢复和状态保持 |
| Events | 用户消息、工具结果、状态变化、中断控制的总线 | 系统更像状态机而不是单次请求，更适合长链路 agent |

## 5. 官方已经落地的运行时优化

| 优化点 | Anthropic 的做法 | 可借鉴之处 |
|-|-|-|
| Prompt caching | 缓存完整前缀，顺序是 tools -> system -> messages | 缓存粒度应该基于稳定前缀，而不是零碎片段 |
| Compaction | 长会话自动压缩，保留关键请求与摘要 | 长运行 Agent 一定要有服务端压缩策略 |
| Preinstalled packages | 环境预装包并跨 session 复用缓存 | 把依赖安装前置，避免任务运行时临时装包 |
| Large output spillover | 超大工具输出写入 sandbox 文件，只回传摘要和路径 | 不要把超长原始输出直接塞进上下文 |
| Checkpoint | 空闲 session checkpoint，恢复时保留文件系统和历史 | 长时任务应有恢复点，不要把每轮都当全新执行 |
| Permission confirmation | 高风险工具使用进入 requires_action，再由外部确认 | 把“是否允许执行”从模型判断里拆出来 |

## 6. 隔离、网络与安全边界

<grid>
<column width-ratio="0.500000">
<callout emoji="🔒">
**官方偏好的边界做法**
- 每个 session 用独立新容器
- 生产优先考虑 `limited` 网络模式
- 工具确认流由外部系统决定是否放行
- 自定义工具采取“模型决策，应用执行”解耦
</callout>
</column>
<column width-ratio="0.500000">
<callout emoji="💡">
**工程上的具体启发**
- 模型不该直接拥有无限外部执行权
- 网络出网策略和内置 web tools 是两条边界，要分别审视
- 风险控制要体现在 runtime policy，而不是只写在 prompt 里
</callout>
</column>
</grid>

## 7. 多 Agent：共享执行面，隔离上下文

| 模式 | Anthropic 的设计 | 建议抄法 |
|-|-|-|
| 共享 sandbox | 多个 agent 共享同一 sandbox / vault | 共享文件和环境，减少重复准备成本 |
| 隔离 thread | 每个 agent 有自己的 session thread 和历史 | 不要把多个 agent 的推理痕迹硬塞进同一上下文 |
| 主线程只收摘要 | 主线程获取 condensed view，而非所有细节 | 多 agent 协作系统必须有摘要协议和结果回传格式 |

---

# 三、最值得直接复用的工程清单

## 1. Claude Code 使用者清单

<callout emoji="✅">
**建议作为团队默认约定**
</callout>

- [ ] 所有功能开发和修 bug 提示都附带验收标准：测试、预期输出或截图

- [ ] 多文件或不确定方案的任务先走 Plan Mode，再开始改代码

- [ ] 仓库初始化 Claude Code 时先跑 /init，再手工精简 CLAUDE.md

- [ ] 把重复纠正和长期规则收敛进 CLAUDE.md，不靠口头重复

- [ ] 控制 CLAUDE.md 体量，删除一次性说明和过期信息

- [ ] 至少配置三个 hooks：通知、编辑后格式化、敏感文件保护

- [ ] 对调查型任务优先使用 subagent，让主会话只保留摘要

- [ ] 并行开发统一使用 worktree，避免多个会话互踩

## 2. Agent 开发者清单

<callout emoji="💡">
**建议作为 agent framework 的默认设计基线**
</callout>

- [ ] 将系统拆成 Prompt、Tools、Environment、Session、Events 五个层次来设计

- [ ] 每个工具必须有高质量 description，写清何时用、何时不用、参数与限制

- [ ] 为复杂工具补 input examples，并减少低价值碎片化工具

- [ ] 建立 context compaction 机制，避免长运行 session 逐轮膨胀

- [ ] 把大输出转储到文件或对象存储，只向模型回传摘要和引用

- [ ] 建立缓存策略，优先缓存稳定前缀和常驻工具描述

- [ ] 将高风险执行接入外部确认流，不让模型单独决定

- [ ] 环境和网络策略独立配置，生产默认最小权限

- [ ] 多 agent 协作时共享执行资源，但隔离各自上下文历史

---

# 四、来源索引

<callout emoji="📝">
下面只列出本次研究中贡献最大的官方页面，便于你回查。若需要，我可以继续把每条结论精确映射到具体段落。
</callout>

| 主题 | 核心来源 |
|-|-|
| Claude Code 总览与工作机制 | [overview](https://code.claude.com/docs/zh-CN/overview)  <br/>[how-claude-code-works](https://code.claude.com/docs/zh-CN/how-claude-code-works) |
| Claude Code 实战最佳实践 | [best-practices](https://code.claude.com/docs/zh-CN/best-practices)  <br/>[common-workflows](https://code.claude.com/docs/zh-CN/common-workflows) |
| 记忆、规则、上下文 | [memory](https://code.claude.com/docs/zh-CN/memory)  <br/>[context-window](https://code.claude.com/docs/zh-CN/context-window)  <br/>[features-overview](https://code.claude.com/docs/zh-CN/features-overview) |
| 权限、subagents、worktrees、hooks | [permission-modes](https://code.claude.com/docs/zh-CN/permission-modes)  <br/>[sub-agents](https://code.claude.com/docs/zh-CN/sub-agents)  <br/>[worktrees](https://code.claude.com/docs/zh-CN/worktrees)  <br/>[hooks-guide](https://code.claude.com/docs/zh-CN/hooks-guide) |
| Platform 总览与 Messages / Prompt / Context | [intro](https://platform.claude.com/docs/zh-CN/intro)  <br/>[prompting best practices](https://platform.claude.com/docs/zh-CN/build-with-claude/prompt-engineering/claude-prompting-best-practices)  <br/>[context-windows](https://platform.claude.com/docs/zh-CN/build-with-claude/context-windows)  <br/>[extended-thinking](https://platform.claude.com/docs/zh-CN/build-with-claude/extended-thinking)  <br/>[prompt-caching](https://platform.claude.com/docs/zh-CN/build-with-claude/prompt-caching) |
| Tool use / MCP / Model 选择 | [tool-use overview](https://platform.claude.com/docs/zh-CN/agents-and-tools/tool-use/overview)  <br/>[implement-tool-use](https://platform.claude.com/docs/zh-CN/agents-and-tools/tool-use/implement-tool-use)  <br/>[mcp-connector](https://platform.claude.com/docs/zh-CN/agents-and-tools/mcp-connector)  <br/>[models overview](https://platform.claude.com/docs/zh-CN/about-claude/models/overview) |
| Managed Agents 架构与运行时 | [managed-agents overview](https://platform.claude.com/docs/zh-CN/managed-agents/overview)  <br/>[sessions](https://platform.claude.com/docs/en/managed-agents/sessions)  <br/>[environments](https://platform.claude.com/docs/en/managed-agents/environments)  <br/>[events-and-streaming](https://platform.claude.com/docs/en/managed-agents/events-and-streaming)  <br/>[managed-agents tools](https://platform.claude.com/docs/en/managed-agents/tools)  <br/>[permission-policies](https://platform.claude.com/docs/en/managed-agents/permission-policies)  <br/>[multi-agent](https://platform.claude.com/docs/en/managed-agents/multi-agent)  <br/>[self-hosted-sandboxes](https://platform.claude.com/docs/en/managed-agents/self-hosted-sandboxes)  <br/>[webhooks](https://platform.claude.com/docs/en/managed-agents/webhooks) |

整理时间：2026-06-18。若 Anthropic 后续调整页面结构或 beta 能力说明，应以最新官方文档为准。
## ADDED Requirements

### Requirement: 终端派 agent provider 抽象

系统 MUST 提供 agent provider 抽象，使 claude、codebuddy 等 CLI agent 通过标准终端（executeInTerminal/sendText）接收指令，与 Copilot Chat 派并存。

#### Scenario: provider 接口统一

- **WHEN** 系统需要向某个 agent 发送流程指令
- **THEN** 所有 agent MUST 实现统一的 `AgentProvider` 接口（`executeInTerminal(prompt, title)`）
- **AND** provider 类型分为终端派（type=terminal）与 Chat 派（type=chat）

#### Scenario: 终端派用基类实现

- **WHEN** 注册 claude、codebuddy、trae 这类接口同构的 CLI agent
- **THEN** 系统 MUST 使用单一基类 `CliAgentProvider`，仅 binary 名称不同（claude/cbc/trae-cli）
- **AND** 不为每个 agent 单独编写 provider 文件

#### Scenario: 选定 agent 路由

- **WHEN** 用户配置了当前使用的 agent（如 claude）
- **THEN** 流程动作经该 agent 的 provider 发送
- **AND** 切换 agent 时后续动作走新 provider

### Requirement: 指令经 buildPrompt 组装

系统 MUST 将流程动作组装为 `/opsx:` 指令加 preamble 的形式，再交给选定 provider 发送。

#### Scenario: 动作转指令

- **WHEN** 用户触发某动作（如对变更 user-auth 开始 plan）
- **THEN** 系统 MUST 组装形如 `/opsx:new user-auth` 的指令
- **AND** 指令前注入对应 preamble（来自 spec-context-state 能力）

### Requirement: 不兼容 agent 的降级处理

当某 agent 与终端派协议不兼容（如 zcode 为 stdio server 架构）时，系统 MUST 降级提示而非静默失败。

#### Scenario: zcode 协议不兼容

- **WHEN** 用户选定 zcode 作为 agent（zcode 为 stdio JSON server，非终端 CLI，与终端派 sendText 协议不兼容）
- **THEN** 触发该 agent 时系统 MUST 提示"zcode 为 server 架构，暂不支持终端派触发"
- **AND** 不抛出未捕获异常
- **AND** 该 agent 作为第三类 provider（stdio 客户端）的预留接口，不在本次实现范围

### Requirement: Copilot Chat 派保留现有行为

系统 MUST 保留 github-copilot agent 走 Copilot Chat API 的现有行为，将其并入 provider 抽象但不改变其工作方式。

#### Scenario: copilot 走 Chat API

- **WHEN** 用户选定 github-copilot 作为 agent
- **THEN** 流程动作经 `workbench.action.chat.open` 发送（与变更前行为一致）
- **AND** 不经终端 sendText

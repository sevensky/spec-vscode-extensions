## ADDED Requirements

### Requirement: Claude 接入与路由
系统 MUST 提供 `claude` 作为有效的 `aiAgent` 配置选项，并能将最终构建的 prompt 正确路由到 Claude 提供者实现（例如 `ClaudeService` 或 VS Code Chat 的 Claude 提供者）。

#### Scenario: 通过设置选择 Claude
- **WHEN** 用户在扩展设置中将 `openspec-for-agent.aiAgent` 设为 `claude`。
- **THEN** 系统 MUST 将后续的所有 prompt 路由到 Claude 的实现路径（例如调用 `ClaudeService.addPromptToThread` 或使用与 Claude 提供者兼容的 VS Code Chat 命令）。

#### Scenario: 未安装 Claude 支持时的降级
- **WHEN** 用户选择 `claude`，但运行环境不具备对应的 Claude 集成（未安装相应扩展或命令不可用）。
- **THEN** 系统 MUST 提示用户缺少依赖，并建议回退到 `github-copilot` 或 `codex`，且不得抛出未处理异常。

### Requirement: 临时文件与清理策略
系统 SHALL 使用临时 Markdown 文件（或与 CodexService 相同的临时目录策略）向 Claude 提供 prompt。当文件创建成功后，系统 MUST 在合理延迟后删除临时文件以避免磁盘垃圾。

#### Scenario: 创建并清理临时文件
- **WHEN** 发送 prompt 到 Claude 时，系统创建临时文件并将其内容写入。
- **THEN** Claude 调用完成或达到超时时，系统 SHALL 在后台删除临时文件，并在日志中记录清理结果。

### Requirement: 与现有 Copilot/Codex 兼容
系统 MUST 保持对 `github-copilot` 与 `codex` 的现有支持；新增 `claude` 时不得改变默认行为或破坏现有流程。

#### Scenario: 切换模型不影响旧流程
- **WHEN** 用户将 `aiAgent` 从 `github-copilot` 切换到 `claude`，然后再切回 `github-copilot`。
- **THEN** 系统 MUST 能够恢复原有的 Copilot 或 Codex 路径，并且之前工作流（如 Create Spec、Start Task）继续正常运行。

### Requirement: 可测试的 Provider 抽象
实现 MUST 为各 AI 提供者暴露可替换的接口（例如 `AIProvider.addPrompt(prompt: string)`），以便在单元测试中 mock 各 provider 行为。

#### Scenario: 单元测试替换 Provider
- **WHEN** 在单元测试中替换 `ClaudeService` 为 mock provider。
- **THEN** 系统 MUST 能在不依赖外部 Claude 环境的情况下验证 prompt 构建逻辑与路由行为。

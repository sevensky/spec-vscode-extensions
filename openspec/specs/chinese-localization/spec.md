# chinese-localization 规格说明

## Purpose
待定 - 由归档变更 support-claude-chinese 创建。归档后请更新 Purpose。
## Requirements
### Requirement: 中文化的 Prompt 行为
系统 MUST 在 `chatLanguage` 配置为 `Chinese (Simplified)` 时，在构建的最终 prompt 中明确包含类似 `请用简体中文回答。` 的指令，以保证目标模型以中文输出。

#### Scenario: chatLanguage 为简体中文
- **WHEN** 用户将 `openspec-for-copilot.chatLanguage` 设为 `Chinese (Simplified)`。
- **THEN** 系统 MUST 在 `buildChatPrompt` 返回的最终 prompt 中追加 `请用简体中文回答。` 或等效中文指令，并保证在没有其他自定义指令覆盖时生效。

### Requirement: 本地化文档与使用说明
系统 SHALL 提供 README 或 docs 中的中文说明段落，解释如何启用 Claude 支持和中文模式，包括配置示例和已知限制。

#### Scenario: 查看使用说明
- **WHEN** 用户打开扩展的 README 或 docs 页面。
- **THEN** 系统 SHALL 在 README 中包含一节中文说明（或中文段落），说明 `aiAgent: claude` 的用法与 `chatLanguage` 的中文设置示例。

### Requirement: 非破坏性默认行为
系统 MUST 在没有显式配置为中文的情况下保留英文默认行为，中文适配不得改变英文用户的默认体验。

#### Scenario: 英文默认不变
- **WHEN** 用户未修改 `chatLanguage`（仍为 `English`）。
- **THEN** 系统 MUST 保持原有的英文 prompt 构建逻辑，不自动插入中文指令。

### Requirement: 扩展内用户可见文本的中文补充
系统 SHALL 在常见用户可见提示（如错误信息、setup 指引、配置说明）中提供中文副本或补充说明，但不要求完全替换 VS Code 本地化资源。

#### Scenario: 报错或缺少依赖
- **WHEN** 系统检测到缺少 Claude 或其他运行时依赖。
- **THEN** 系统 SHALL 在弹窗或输出通道中提供中文说明（例如如何安装依赖或回退到 `github-copilot`）。


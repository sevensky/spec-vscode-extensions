## Why

当前 `openspec-for-agent-main` 扩展主要面向 OpenAI 生态，并且大部分交互和提示仍以英文为主。随着 Claude 在国内外场景中的广泛使用，以及中文用户对本地化支持的期待，我们需要让这个扩展同时支持 Claude，并提供中文适配，从而提升中文用户的使用体验和扩展的兼容性。

## What Changes

- 新增对 Claude 模型的集成能力，允许扩展在配置中选择 Claude 作为后端 LLM 提供者。
- 新增中文本地化支持，将界面文本、提示模板、示例文本等适配为简体中文。
- 修改扩展配置和命令逻辑，以支持多种模型提供者同时共存，并保留现有 OpenAI 兼容性。
- 更新文档和使用说明，说明 Claude 支持及中文本地化的使用方式。

## Capabilities

### New Capabilities
- `claude-integration`: 支持 Claude 作为 Copilot/OpenSpec 扩展的后端模型提供者
- `chinese-localization`: 支持扩展界面、提示模板和文档的中文化适配

### Modified Capabilities
- 

## Impact

- 影响 `vscode-extensions/openspec-for-agent-main` 扩展代码和配置逻辑。
- 影响扩展的界面文案、提示模板、语言资源、以及相关的 README/使用说明文档。
- 可能涉及扩展初始化、模型选择、请求构建、结果展示等功能点的改造。
- 需要验证现有 OpenAI 流程在新增 Claude 支持后的兼容性。

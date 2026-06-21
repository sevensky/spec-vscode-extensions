# Proposal: multi-agent-command-paths

## Why

扩展的 `readPromptFile` 硬编码 `.github/prompts/` 路径（GitHub Copilot 专属），导致选择 `claude` / `trae` / `codebuddy` agent 时无法找到命令文件，报"未找到 OpenSpec v1 提示词文件"错误。

扩展原本为 GitHub Copilot 设计，`AiAgent` 类型仅含 `"github-copilot" | "codex" | "claude"`，未覆盖 `trae` / `codebuddy`。用户需要扩展支持所有 OpenSpec CLI 已支持的 agent。

## What Changes

### 扩展端（本仓库 openspec-for-agent-main）

1. **扩展 `AiAgent` 类型**：加入 `"trae" | "codebuddy"`，同步更新 `package.json` 的 `aiAgent` enum。
2. **新建 agent → 命令路径映射**：参考 CLI adapters，定义各 agent 的命令目录、v1 文件名模式、legacy 文件名。
3. **改造 `readPromptFile`**：新增 `agent` 参数，根据 agent 动态选择路径和文件名；保持向后兼容（默认 `github-copilot`）。
4. **改造 3 个调用点**：`create-spec-input-controller` / `spec-manager` / `register-spec-commands` 传入当前 agent。
5. **错误提示按 agent 分化**：`createMigrationError` 根据 agent 给出对应的 `openspec init` 指引和路径。

### CLI 端（前置依赖，OpenSpec-Cn 仓库）

6. **新增 Trae command adapter**：让 `openspec init` 生成 `.trae/commands/opsx/<id>.md`。当前 CLI 只有 trae 的 skill adapter，无 command adapter。

## 前置依赖说明

扩展改造（1-5）不严格依赖 CLI 改造（6）——扩展改了路径后，若 CLI 未生成对应文件，扩展会报错引导用户运行 `openspec init`。但完整体验需要 CLI 也支持 trae 命令生成。建议并行推进。

## Out of Scope

- `chat-prompt-runner.ts` 的 agent 分发逻辑（如何把 prompt 发给 trae/codebuddy CLI 执行）——这是独立话题，本 change 仅解决命令文件读取路径。
- `prompts-explorer-provider.ts` 的 `getAgentsRoot()` 硬编码 `.github/agents`——这是 Prompts 视图的展示逻辑，不在本 change 范围。

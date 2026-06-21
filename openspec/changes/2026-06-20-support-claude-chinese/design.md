## 背景

`openspec-for-agent-main` 当前扩展已经支持 GitHub Copilot Chat 和 Codex 两种后端，会通过 `aiAgent` 配置来选择发送 Prompt 的方式。扩展本身也提供了 `chatLanguage` 配置，用于在 prompt 中追加语言要求。

当前存在两个痛点：
1. 国内/中文用户希望直接使用 Claude 系列大模型，而不是仅限 Copilot 或 Codex。
2. 扩展文档、提示和本地化支持仍以英文为主，中文使用体验不够顺畅。

因此本次变更需要在保持现有 Copilot/Codex 兼容性的前提下，引入 Claude 支持，并让扩展在中文场景下的提示与文档更贴合。

## 目标 / 非目标

**目标：**
- 为扩展新增 Claude 后端支持，使用户可以从 `openspec-for-agent.aiAgent` 中选择 `claude`。
- 在扩展内部建立清晰的 AI 提供者抽象层，隔离 GitHub Copilot、Codex、Claude 的差异。
- 将中文语言支持补齐到 prompt 构建、文档说明和扩展配置说明中。
- 保留现有 GitHub Copilot / Codex 流程，避免对现有用户造成破坏性变更。

**非目标：**
- 不做 VS Code 官方本地化翻译机制的全面改造，仅适配扩展自身的中文使用体验。
- 不重写 OpenSpec 流程或改变当前 spec/tasks/设计生成逻辑。
- 不立即支持所有 Claude 变体的深度能力差异，仅做通用接入与语言适配。

## 关键决策

- 采用 `AIProvider` 或类似抽象层来统一发送 Prompt 的逻辑，而不是在各处直接判断 `aiAgent`。
  - 目前已有 `chat-prompt-runner.ts` 和 `CodexService`，设计上应增加 `ClaudeService` 或通用 provider 模块。
  - `ConfigManager` 的 `AiAgent` 类型扩展为 `"github-copilot" | "codex" | "claude"`。

- Claude 集成方案建议按能力分两类：
  1. 如果目标是通过 VS Code Chat 提供者使用 Claude，则在 `sendPromptToChat` 中增加 provider 参数或者调用特定命令。
  2. 如果目标是通过 Claude 扩展/CLI，则新增 `ClaudeService`，类似现有 `CodexService`，生成临时 Markdown 并调用对应命令。

- 中文适配优先级放在“扩展自身提示、文档、默认 prompt 语言指令”上：
  - 保持现有 `chatLanguage` 配置，确保它在 `buildChatPrompt` 中对 `Chinese (Simplified)` 和其他语言生效。
  - 为中文用户提供 README、使用说明、配置说明的简体中文版本或新增说明段落。
  - 将扩展内部的用户提示、错误消息、日志注释等可见文本尽量补齐中文说明，但不要求对 VS Code 按钮文本做完整国际化。

- 兼容性策略：
  - 不改变原有 `github-copilot` 和 `codex` 选项的默认行为。
  - 如果 `aiAgent` 配置值被扩展为 `claude`，仍然允许旧值工作。
  - 添加必要的 feature flags / fallback 逻辑，在用户没有安装对应 Claude 支持时友好提示。

## 风险 / 权衡

- Claude 提供者命令与间接集成方式尚未确定：如果目标环境中的 Claude 扩展或命令不一致，需要额外验证。
  - 缓解：先做抽象层，后续只在 provider 实现层新增命令适配。

- 可能出现 `workbench.action.chat.open` 对不同模型提供者支持不一致。
  - 缓解：保留 `CodexService` / `ClaudeService` 的独立实现，避免单一路径依赖 VS Code Chat 命令。

- 中文适配范围如果过大会增加开发成本。
  - 缓解：本次只做“扩展内文案、使用说明、提示模板”的中文适配，不做 VS Code 本地化资源包。

- 若直接把 `chatLanguage` 中文值写入 prompt，而目标模型并不识别中文语言标签，可能导致效果不理想。
  - 缓解：在 prompt 中对中国用户选择 `Chinese (Simplified)` 时，使用明确的中文提示语句，例如 `请用简体中文回答`，而不是仅依赖语言名。

## 迁移计划

1. 修改 `src/utils/config-manager.ts`，扩展 `AiAgent` 类型并保留现有配置读取逻辑。
2. 在 `src/utils/chat-prompt-runner.ts` 中新增 Claude 分支，或引入新的 `AIProvider` 抽象。
3. 实现 `src/services/claude-service.ts`（或在现有 provider 里增加 Claude 支持），并对 `sendPromptToChat` 做路由处理。
4. 更新 `package.json` 与 `package.nls.json`（如果存在）中可选配置项，新增 `claude` 选项说明。
5. 补充 `README.md`、`docs/`、提示模板中的中文使用说明，确保中文用户能直接看到 Claude + 中文适配方案。
6. 增加单元测试，覆盖 `ConfigManager`、`buildChatPrompt` 和新 Claude provider 的行为。
7. 发布后验证：
   - 选择 `claude` 时能够成功发起聊天请求或临时文件内容。
   - `chatLanguage` 设为 `Chinese (Simplified)` 时，生成 prompt 里包含中文指令。
   - 原有 `github-copilot` 和 `codex` 路径仍正常工作。

回滚策略：如果 Claude 路径出现问题，可快速移除 `claude` 选项并回退到原来的 `aiAgent` 枚举；中文适配只影响文档和 prompt，不会破坏现有流程。

## 待确认问题

- 目标 Claude 运行环境是什么？是通过 VS Code Chat 的 Claude 提供者，还是通过特定 Claude 扩展/CLI？
- 是否只需要支持 `Chinese (Simplified)`，还是也要兼容繁体中文？
- 是否需要新增 `aiAgent` 之外的独立模型选择配置，比如 `aiProvider` 或 `modelProvider`？
- 现有用户是否要求在中文模式下自动切换提示模板，而不仅仅是追加语言指令？
- 是否要把扩展 UI 中的“Create Spec”、“Start Task”等按钮说明也翻译成中文？
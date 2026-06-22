# Proposal: 将 copilot.* 配置项重命名为 agent.* 并适配多 agent chat

## Why

当前扩展的配置项以 `copilot.` 为前缀（如 `openspec-for-agent.copilot.promptsPath`），这是历史遗留——扩展最初只支持 GitHub Copilot。经过多 agent 改造后，扩展已支持 github-copilot、codex、claude、trae、codebuddy 五个 agent，`copilot.` 前缀已名不副实。

同时，`chatgpt.addToThread` 命令是 GitHub Copilot Chat 的私有命令，其他 agent（Trae/Claude/CodeBuddy）没有这个命令，导致非 Copilot agent 无法使用"添加到 chat"功能。

### 核心问题

| 问题 | 影响 |
|------|------|
| `copilot.promptsPath` 命名误导 | 用户以为只对 Copilot 生效 |
| 默认值 `.github/prompts` 偏向 Copilot | 其他 agent 用户需手动改 |
| `chatgpt.addToThread` 硬编码 | Trae/Claude/CodeBuddy 无法发送到 chat |
| 无配置迁移机制 | 老用户升级后配置丢失 |

## What Changes

### 1. 配置项重命名

| 旧名 | 新名 | 默认值变化 |
|------|------|-----------|
| `openspec-for-agent.copilot.promptsPath` | `openspec-for-agent.agent.promptsPath` | `.github/prompts` → `.agent/prompts` |
| `openspec-for-agent.copilot.specsPath` | `openspec-for-agent.agent.specsPath` | （如存在） |
| `openspec-for-agent.copilot.chatLanguage` | `openspec-for-agent.agent.chatLanguage` | 不变 |
| `openspec-for-agent.copilot.aiAgent` | `openspec-for-agent.agent.aiAgent` | 不变 |
| `openspec-for-agent.copilot.customInstruction` | `openspec-for-agent.agent.customInstruction` | 不变 |
| `openspec-for-agent.copilot.createSpecInstruction` | `openspec-for-agent.agent.createSpecInstruction` | 不变 |
| `openspec-for-agent.copilot.startAllTasksInstruction` | `openspec-for-agent.agent.startAllTasksInstruction` | 不变 |
| `openspec-for-agent.copilot.archiveChangeInstruction` | `openspec-for-agent.agent.archiveChangeInstruction` | 不变 |
| `openspec-for-agent.copilot.runPromptInstruction` | `openspec-for-agent.agent.runPromptInstruction` | 不变 |

### 2. 默认路径调整

- `promptsPath` 默认值：`.github/prompts` → `.agent/prompts`
- 此路径是**用户自定义提示词**的存储位置，与 `AGENT_COMMAND_CONFIGS`（内置命令路径）无关

### 3. 多 agent chat 适配

为每个 agent 定义对应的"发送到 chat"命令：

| Agent | 命令 | 说明 |
|-------|------|------|
| github-copilot | `chatgpt.addToThread` | 现有行为 |
| codex | `chatgpt.addToThread` | 现有行为（Codex 复用 Copilot 命令） |
| claude | （待研究） | Claude Code 的 chat API |
| trae | （待研究） | Trae 的 chat API |
| codebuddy | （待研究） | CodeBuddy 的 chat API |

> **注意**：claude/trae/codebuddy 的 chat 命令需要调研。如果找不到对应命令，fallback 到"复制到剪贴板 + 提示用户粘贴"。

### 4. 配置迁移

扩展激活时自动检测旧配置：
- 读取 `copilot.*` 配置
- 如果用户设置了非默认值，写入对应的 `agent.*` 配置
- 保留 `copilot.*` 不删（避免降级后丢失）

## Impact

### 受影响文件

| 文件 | 改动类型 |
|------|---------|
| `package.json` | 配置项定义改名 |
| `package.nls.json` / `package.nls.zh-cn.json` | 描述文本改名 |
| `src/utils/config-manager.ts` | 读取配置的 key 改名 + 迁移逻辑 |
| `src/utils/copilot-chat-utils.ts` | 多 agent chat 命令适配 |
| `src/utils/agent-command-paths.ts` | （可能）新增 chat 命令映射 |
| `README.md` / `README.zh-cn.md` | 文档更新 |
| 测试文件 | 更新 mock 配置 |

### 兼容性

- **老用户**：自动迁移配置，无感知升级
- **新用户**：直接用新配置名，默认路径更合理
- **降级**：`copilot.*` 配置保留，降级后仍可用

### 风险

| 风险 | 缓解 |
|------|------|
| claude/trae/codebuddy 无 chat 命令 | Fallback 到剪贴板方案 |
| 迁移逻辑有 bug | 充分测试 + 保留旧配置 |
| 用户自定义了 `copilot.*` | 迁移时优先用用户值 |

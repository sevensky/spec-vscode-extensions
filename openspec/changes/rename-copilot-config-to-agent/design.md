# Design: 将 copilot.* 配置项重命名为 agent.* 并适配多 agent chat

## Context

经过代码分析，实际情况比 proposal 中描述的更简单：

### 配置项现状

| 配置项 | 是否有 `copilot.` 前缀 | 需要改名 |
|--------|----------------------|---------|
| `copilot.specsPath` | ✓ | ✓ → `agent.specsPath` |
| `copilot.promptsPath` | ✓ | ✓ → `agent.promptsPath` |
| `aiAgent` | ✗ | 不需要 |
| `chatLanguage` | ✗ | 不需要 |
| `customInstructions.*` | ✗ | 不需要 |

**只有 2 个配置项需要改名**，其他已经没有 `copilot.` 前缀。

### Chat 适配现状

`sendPromptToChat`（[chat-prompt-runner.ts:37](../../../src/utils/chat-prompt-runner.ts#L37)）已支持多 agent：
- codex → `CodexService.addPromptToThread`
- claude → `ClaudeService.addPromptToThread`
- 其他 → `workbench.action.chat.open`（VS Code 通用 chat 命令）

`addDocumentToCopilotChat`（[copilot-chat-utils.ts:44](../../../src/utils/copilot-chat-utils.ts#L44)）硬编码 `chatgpt.addToThread`，仅 Copilot 可用。此函数用于"将提示词文件添加到 chat"，被 `prompts-explorer-provider.ts:195` 调用。

## Goals / Non-Goals

### Goals
1. 将 `copilot.specsPath` / `copilot.promptsPath` 重命名为 `agent.*`
2. 默认 `promptsPath` 从 `.github/prompts` 改为 `.agent/prompts`
3. `addDocumentToCopilotChat` 适配多 agent
4. 自动迁移老用户配置

### Non-Goals
- 不改 `aiAgent` / `chatLanguage` / `customInstructions.*`（已无 `copilot.` 前缀）
- 不改 `sendPromptToChat`（已支持多 agent）
- 不改 `AGENT_COMMAND_CONFIGS`（内置命令路径，与本次无关）

## Design

### 1. 配置项重命名

#### package.json

```diff
- "openspec-for-agent.copilot.specsPath": {
+ "openspec-for-agent.agent.specsPath": {
    "type": "string",
    "default": "openspec",
-   "description": "%config.desc.copilot_specsPath%",
+   "description": "%config.desc.agent_specsPath%",
    "order": 1
  },
- "openspec-for-agent.copilot.promptsPath": {
+ "openspec-for-agent.agent.promptsPath": {
    "type": "string",
-   "default": ".github/prompts",
+   "default": ".agent/prompts",
-   "description": "%config.desc.copilot_promptsPath%",
+   "description": "%config.desc.agent_promptsPath%",
    "order": 2
  }
```

#### package.nls.json / package.nls.zh-cn.json

key 从 `config.desc.copilot_*` 改为 `config.desc.agent_*`。

#### config-manager.ts

```typescript
// 旧
const promptsPath = config.get<string>("copilot.promptsPath")?.trim();
const specsPath = config.get<string>("copilot.specsPath")?.trim();

// 新
const promptsPath = config.get<string>("agent.promptsPath")?.trim();
const specsPath = config.get<string>("agent.specsPath")?.trim();
```

#### constants.ts

```typescript
// 旧
paths: {
  prompts: ".github/prompts",
  specs: "openspec",
},

// 新
paths: {
  prompts: ".agent/prompts",
  specs: "openspec",
},
```

### 2. 配置迁移

在 `ConfigManager.getConfiguredPaths()` 中加入迁移逻辑：

```typescript
private getConfiguredPaths(): Partial<Record<keyof typeof DEFAULT_PATHS, string>> {
  const config = workspace.getConfiguration(VSC_CONFIG_NAMESPACE);

  // 优先读新 key，fallback 到旧 key（迁移兼容）
  const promptsPath =
    config.get<string>("agent.promptsPath")?.trim() ||
    config.get<string>("copilot.promptsPath")?.trim();
  const specsPath =
    config.get<string>("agent.specsPath")?.trim() ||
    config.get<string>("copilot.specsPath")?.trim();

  const configuredPaths: Partial<Record<keyof typeof DEFAULT_PATHS, string>> = {};
  if (promptsPath) configuredPaths.prompts = promptsPath;
  if (specsPath) configuredPaths.specs = specsPath;
  return configuredPaths;
}
```

**策略**：读时 fallback，不自动写入新 key。原因：
- 避免激活时写配置的副作用
- 用户卸载新版本降级到旧版时，旧配置仍在
- VS Code 设置 UI 会显示新 key，用户自然迁移

### 3. addDocumentToCopilotChat 多 agent 适配

#### 新增 AGENT_CHAT_COMMANDS 映射

在 `agent-command-paths.ts` 中新增（或单独文件）：

```typescript
export const AGENT_CHAT_COMMANDS: Record<AiAgent, string | null> = {
  "github-copilot": "chatgpt.addToThread",
  codex: "chatgpt.addToThread", // Codex 复用 Copilot 命令
  claude: null,    // Claude 无对应命令，fallback
  trae: null,      // Trae 无对应命令，fallback
  codebuddy: null, // CodeBuddy 无对应命令，fallback
};
```

#### 改造 addDocumentToCopilotChat

```typescript
import { AGENT_CHAT_COMMANDS } from "./agent-command-paths";
import { ConfigManager } from "./config-manager";

export const addDocumentToAgentChat = async (
  documentUri: Uri,
  showOptions?: TextDocumentShowOptions
): Promise<void> => {
  const { aiAgent } = ConfigManager.getInstance().getSettings();
  const commandId = AGENT_CHAT_COMMANDS[aiAgent];

  if (commandId) {
    // Copilot/Codex：选中全文 + 执行命令
    await selectEntireDocument(documentUri, showOptions);
    await commands.executeCommand(commandId);
  } else {
    // Claude/Trae/CodeBuddy：打开文件，让用户手动复制到 chat
    await selectEntireDocument(documentUri, showOptions);
    // 可选：复制到剪贴板
    await commands.executeCommand("editor.action.clipboardCopyAction");
  }
};
```

#### 重命名

- 文件：`copilot-chat-utils.ts` → `agent-chat-utils.ts`
- 函数：`addDocumentToCopilotChat` → `addDocumentToAgentChat`
- 测试：`copilot-chat-utils.test.ts` → `agent-chat-utils.test.ts`

### 4. 文件重命名清单

| 旧文件 | 新文件 |
|--------|--------|
| `src/utils/copilot-chat-utils.ts` | `src/utils/agent-chat-utils.ts` |
| `src/utils/copilot-chat-utils.test.ts` | `src/utils/agent-chat-utils.test.ts` |

### 5. 调用点更新

| 文件 | 改动 |
|------|------|
| `src/providers/prompts-explorer-provider.ts:19` | import 路径 + 函数名 |
| `src/providers/prompts-explorer-provider.ts:195` | 函数调用名 |

## Risks

| 风险 | 缓解 |
|------|------|
| 老用户 `copilot.*` 配置失效 | 读时 fallback 到旧 key |
| `addDocumentToAgentChat` 对非 Copilot agent 体验差 | 复制到剪贴板 + 提示 |
| 文件重命名导致 git 历史断裂 | 保留旧文件内容为空或 re-export |

## Migration Path

1. 本次发布：新 key 生效，旧 key 仍可读
2. 下次大版本：移除旧 key fallback

# Design: multi-agent-command-paths

## Context

OpenSpec CLI 为每个 agent 生成不同格式的命令文件，路径和命名各异。扩展需根据当前 `aiAgent` 配置读取对应路径。

## Agent 命令路径映射

基于 [OpenSpec-Cn/src/core/command-generation/adapters/](file:///www/wwwroot/vscode-extensions/OpenSpec-Cn/src/core/command-generation/adapters/) 的实现：

| Agent          | 命令目录（相对 workspace）       | v1 文件名模式            | legacy 文件名                    |
|----------------|----------------------------------|--------------------------|----------------------------------|
| github-copilot | `.github/prompts/`               | `opsx-{id}.prompt.md`    | `openspec-{legacyId}.prompt.md`  |
| claude         | `.claude/commands/opsx/`         | `{id}.md`                | 无（claude 无 legacy）           |
| codebuddy      | `.codebuddy/commands/opsx/`      | `{id}.md`                | 无                               |
| trae           | `.trae/commands/opsx/`           | `{id}.md`                | 无                               |
| codex          | `~/.codex/prompts/`（全局）      | `opsx-{id}.md`           | 无                               |

### 命令 ID 映射

扩展的 3 个操作对应以下命令 ID：

| 操作          | v1 id      | legacy id（仅 github-copilot） |
|---------------|------------|-------------------------------|
| 创建 Spec     | `propose`  | `proposal`                    |
| 应用任务      | `apply`    | `apply`                       |
| 归档变更      | `archive`  | `archive`                     |

### Trae 命令文件格式

根据 Trae 官方文档：
- 路径：`.trae/commands/`（项目级），支持最多 3 层嵌套
- 格式：`.md` 文件，frontmatter + 指令正文
- frontmatter 字段：`name`、`description`（参考 Trae skill 文件用英文 key）
- 嵌套路径 `.trae/commands/opsx/{id}.md` 符合 3 层限制（commands/opsx/ 是第 2 层）

**待验证**：Trae 命令 frontmatter 的 key 是英文（`name`/`description`）还是中文（`名称`/`描述`）。文档表格用中文标签，但 skill 文件用英文 key。本 change 默认采用英文 key，与 skill 文件保持一致，需在实现后通过 Trae IDE 验证 `/opsx:propose` 斜杠命令是否正常触发。

## 技术方案

### 1. 新建 `src/utils/agent-command-paths.ts`

```typescript
export interface AgentCommandConfig {
  /** 命令目录（相对 workspace 根，分段数组） */
  readonly dir: readonly string[];
  /** v1 文件名构造器 */
  readonly v1Filename: (id: string) => string;
  /** legacy 文件名构造器（可选，仅 github-copilot） */
  readonly legacyFilename?: (id: string) => string;
  /** 是否全局路径（codex 用 ~/.codex/） */
  readonly isGlobal?: boolean;
}

export const AGENT_COMMAND_CONFIGS: Record<AiAgent, AgentCommandConfig> = {
  "github-copilot": {
    dir: [".github", "prompts"],
    v1Filename: (id) => `opsx-${id}.prompt.md`,
    legacyFilename: (legacyId) => `openspec-${legacyId}.prompt.md`,
  },
  claude: {
    dir: [".claude", "commands", "opsx"],
    v1Filename: (id) => `${id}.md`,
  },
  codebuddy: {
    dir: [".codebuddy", "commands", "opsx"],
    v1Filename: (id) => `${id}.md`,
  },
  trae: {
    dir: [".trae", "commands", "opsx"],
    v1Filename: (id) => `${id}.md`,
  },
  codex: {
    dir: [".codex", "prompts"],
    v1Filename: (id) => `opsx-${id}.md`,
    isGlobal: true,
  },
};

/** 命令 ID 映射：操作 → { v1, legacy } */
export const COMMAND_IDS = {
  propose: { v1: "propose", legacy: "proposal" },
  apply: { v1: "apply", legacy: "apply" },
  archive: { v1: "archive", legacy: "archive" },
} as const;
```

### 2. 改造 `readPromptFile`

当前签名：
```typescript
readPromptFile(workspaceUri: Uri, v1File: string, legacyFile: string)
```

改造后：
```typescript
readPromptFile(workspaceUri: Uri, agent: AiAgent, commandId: { v1: string; legacy?: string })
```

内部逻辑：
1. 从 `AGENT_COMMAND_CONFIGS[agent]` 取路径配置
2. 构造 v1 文件路径：`joinPath(workspaceUri, ...dir, v1Filename(commandId.v1))`
3. 若有 legacyFilename，构造 legacy 路径
4. 先读 v1，不存在读 legacy，都不存在抛 `createMigrationError`
5. codex 的 `isGlobal` 场景：路径基于 `os.homedir()` 而非 workspaceUri

### 3. 改造 3 个调用点

每个调用点从 `configManager.getSettings().aiAgent` 取当前 agent，用 `COMMAND_IDS` 传命令 ID：

```typescript
const { aiAgent } = configManager.getSettings();
const result = await readPromptFile(workspaceUri, aiAgent, COMMAND_IDS.propose);
```

### 4. 改造 `createMigrationError`

新增 `agent` 参数，根据 agent 给出对应的路径和 init 指引：

- github-copilot: `.github/prompts/opsx-{id}.prompt.md`
- claude: `.claude/commands/opsx/{id}.md`
- trae: `.trae/commands/opsx/{id}.md`
- ...

错误提示文案保持现有结构（3 个可能原因），仅替换路径部分。

### 5. 扩展 `AiAgent` 类型

```typescript
// config-manager.ts
export type AiAgent = "github-copilot" | "codex" | "claude" | "trae" | "codebuddy";
```

同步更新 `package.json` 的 `aiAgent` enum 和 `package.nls.*.json` 的 enum 描述。

## 向后兼容

- `readPromptFile` 默认 agent 为 `github-copilot`，现有行为不变
- legacy 文件名仅 `github-copilot` 有，其他 agent 跳过 legacy 读取
- 现有测试用 `github-copilot` agent，应继续通过

## 风险

1. **Trae 命令 frontmatter 格式未验证**：需实现后通过 Trae IDE 实测 `/opsx:propose` 是否触发
2. **codex 全局路径**：`~/.codex/prompts/` 不在 workspace 内，`workspace.fs.readFile` 可能无法直接读，需用 Node `fs` 或 `Uri.file(os.homedir())`
3. **CLI 未生成 trae 命令**：扩展改了路径但 CLI 没生成文件，用户会看到错误提示——这是预期行为，错误提示会引导用户

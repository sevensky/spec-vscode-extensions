## Why

扩展当前的 spec 浏览体验停留在"点击树节点 → 打开 markdown 文件编辑器"，用户无法在 IDE 内一眼看到某个变更的全貌（proposal/design/tasks/进度/状态）。而参考项目 speckit-companion 已验证了一套成熟模式：富 Webview 面板 + 状态桥梁 JSON + 多 CLI provider 桥接，实现了"点击看全貌、按钮驱动流程、状态实时同步"。

本扩展上一个变更 `multi-agent-command-paths` 已完成 agent 路径映射（trae/codebuddy/claude/copilot），但 agent 桥接仍走单一的 Copilot Chat API。实测本机已装 claude CLI（`@anthropic-ai/claude-code`）与 codebuddy CLI（`@tencent-ai/codebuddy-code`），二者接口同构（`[prompt] -p` 非交互模式），具备直接用标准终端 `sendText` 送指令的条件。现在做：引入富面板 + 状态桥梁 + 终端派 provider，把扩展从"Copilot 专属"升级为"多 agent 通用"。

## What Changes

### 新增：富 spec 面板（WebviewPanel）

- 点击树节点不再只打开文件，而是打开一个富 Webview 面板（对标 speckit 的 specViewerProvider）。
- 面板内展示：当前 spec 的文档内容（proposal/design/tasks）、当前所处 step、status、动作历史。
- 面板内按钮可触发动作（如"标记完成""归档""重新激活"），按钮可见性由 spec 状态驱动。
- 按变更目录分组，支持多面板并存；文件变更时自动刷新。

### 新增：状态桥梁 `.spec-context.json`

- 每个 change 目录新增 `.spec-context.json`，记录 `{ step, status, history }`。
- 扩展负责读写 + 文件监听（panel 刷新的依据）。
- 通过 prompt preamble 指示 agent 在完成步骤后更新该文件（学 speckit），同时以 openspec 工作区文件变化（proposal.md/tasks.md 生成）做兜底校验。
- 与 openspec CLI 既有的 `.openspec.yaml`（仅存 schema/created 元数据）并存，职责分离——`.openspec.yaml` 管 CLI 元数据，`.spec-context.json` 管扩展运行时状态。

### 新增：多 provider 桥接（终端派 + 保留 Chat 派）

- 引入 provider 抽象，按 CLI 接口同构性分组（实测 claude/codebuddy 接口一致）：
  - **终端派**（executeInTerminal）：`claudeProvider`、`codebuddyProvider`、`traeProvider`（预留接口）、`zcodeProvider`（预留，低优先级）。
  - **Chat 派**（保留现有）：`copilotProvider` 走 `workbench.action.chat.open`。
- 终端派实现为单一基类 `CliAgentProvider(binary)`，各 agent 仅 binary 不同（`claude`/`cbc`/...），因接口同构无需每家各写一套。
- 动作（如"开始 plan"）经 `buildPrompt` 组装为 `/opsx:xxx` 指令 + preamble，送入选定 agent 的终端。

### 修改：spec 树点击行为

- `spec-explorer` 的点击从"打开文件"改为"触发富面板"（向后兼容：仍可通过右键打开源文件）。

## Capabilities

### New Capabilities
- `spec-viewer-panel`: 富 Webview 面板能力——展示变更全貌（文档/step/status/历史），按钮驱动流程动作，按目录分组多面板，文件变化自动刷新。
- `spec-context-state`: 变更状态桥梁能力——`.spec-context.json` 的读写与监听，作为面板刷新与 provider 编排的状态单一来源，preamble 主导 + 文件兜底校验。
- `agent-terminal-providers`: 终端派 agent 桥接能力——通过标准终端送指令给 claude/codebuddy/trae/zcode CLI，provider 按接口同构性用基类实现，与 Copilot Chat 派并存。

### Modified Capabilities
- `spec-explorer`: 点击树节点行为从"打开文件"改为"打开富面板"；右键保留"打开源文件"入口。

## Impact

- **新增源码**：`spec-viewer/`（panel provider + 状态组装）、`spec-context/`（bridge 读写监听）、`agent-providers/`（terminal 派 provider + 抽象基类）、prompt preamble 生成。
- **修改源码**：`spec-explorer-provider.ts`（点击行为）、`register-spec-commands.ts`（动作经 provider 路由）、`chat-prompt-runner.ts`（并入 provider 抽象）。
- **既有资产复用**：openspec CLI（1.4.2）+ opsx command 不改动（模式 A，扩展编排不重造 CLI）；上一个变更的 agent 路径映射（trae/codebuddy）直接复用。
- **运行时依赖**：claude CLI / codebuddy CLI 需用户已装；trae/zcode 预留接口，运行时缺失时降级提示。
- **风险**：`.spec-context.json` 的 preamble 驱动依赖 agent 听话；不同 provider 听话程度不同，需用兜底校验缓解。富面板是大工程，需拆分迭代。

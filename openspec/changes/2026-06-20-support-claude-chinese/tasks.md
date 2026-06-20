# Tasks: support-claude-chinese

> 实现 Claude 终端 CLI 集成 + 简体中文适配。
> 路径：`vscode-extensions/openspec-for-copilot-main/`
> 范本：CodexService（同目录 src/services/）+ companion 的 claudeCodeProvider

## 1. 配置层：AiAgent 类型扩展

- [x] **1.1** `src/utils/config-manager.ts:10` — `AiAgent` 类型加 `"claude"`：`"github-copilot" | "codex" | "claude"`
- [x] **1.2** `src/utils/config-manager.ts:109-113` — `getAiAgent()` 改三分支判断（当前 `raw === "codex" ? "codex" : "github-copilot"` 会把 claude 错误归到 copilot），改为显式匹配 claude/codex，其余默认 github-copilot
- [x] **1.3** `package.json:86-89` — `openspec-for-copilot.aiAgent` 的 enum 加 `"claude"`

## 2. ClaudeService 实现（终端 CLI 方案）

- [x] **2.1** 新建 `src/services/claude-service.ts`，仿 `codex-service.ts` 结构（静态类），实现 `addPromptToThread(prompt: string): Promise<void>`：
  - 临时文件目录 `~/.claude/.tmp/YYYYMMDD-<uuid>.md`（照 codex 的 buildTempFileUri/writeTempFile）
  - **终端调度**（与 codex 不同）：`window.createTerminal({ name, cwd })` → `terminal.show()` → `terminal.sendText("claude \"$(cat <tmpfile>)\"", true)`
  - 旧文件清理 `cleanupOldTempFiles`（7 天，照 codex）
- [x] **2.2** 处理 Claude CLI 未安装的降级：检测 `claude` 命令不可用时，`window.showErrorMessage` 提示安装并建议回退 github-copilot/codex（对应 spec: 未安装 Claude 支持时的降级）
- [x] **2.3** 临时文件清理：sendText 后 setTimeout 30s 删除 tempFile（best-effort，对应 spec: 临时文件与清理策略）

## 3. 路由层：接入 Claude 分支

- [x] **3.1** `src/utils/chat-prompt-runner.ts:54-57` — `sendPromptToChat` 加 `else if (aiAgent === "claude") { await ClaudeService.addPromptToThread(finalPrompt); return; }`（在 codex 分支之后、默认 copilot 分支之前）
- [x] **3.2** 确认 buildChatPrompt 无需改（语言指令在路由前追加，对所有 agent 生效）— 仅验证，不改

## 4. 测试

- [x] **4.1** 新建 `src/services/claude-service.test.ts`，仿 `codex-service.test.ts`，覆盖：写 tempFile、createTerminal+sendText、cleanupOldTempFiles、CLI 未安装降级
- [x] **4.2** `src/utils/chat-prompt-runner.test.ts`（227 行后）— 加 claude 分支用例：mock ClaudeService，断言 `aiAgent: "claude"` 时调用 ClaudeService（照现有 codex 用例复制）
- [x] **4.3** `src/utils/config-manager.test.ts`（50 行后）— 加用例：raw="claude" 时 getAiAgent 返回 "claude"
- [x] **4.4** 运行 `pnpm test` 全绿（18/18 passed）

## 5. 简体中文适配

- [x] **5.1** `src/utils/chat-prompt-runner.ts:39-41` — 优化中文语言指令：当 `chatLanguage === "Chinese (Simplified)"` 时，追加 `请用简体中文回答。`（当前是英文 `Please respond in Chinese (Simplified).`，对模型识别不够明确，design 风险项提到）
- [x] **5.2** `README.md` — 补充 Claude + 中文使用说明段落（aiAgent 选 claude、chatLanguage 选 Chinese (Simplified)）
- [x] **5.3** 确认 chatLanguage enum 已含 Chinese (Simplified)（package.json:101 已有，仅验证）

## 6. 规格更新（可选）

- [x] **6.1** ~~`openspec/specs/chat-integration/spec.md`~~ — 跳过：本次 change 的 spec 已在 `openspec/changes/support-claude-chinese/specs/` 定义需求，capability spec 更新留待 archive 时一并处理

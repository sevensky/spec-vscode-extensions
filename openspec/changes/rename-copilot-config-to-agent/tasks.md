# Tasks: 将 copilot.* 配置项重命名为 agent.* 并适配多 agent chat

## 1. 配置项重命名

- [x] 1.1 修改 `package.json`：`copilot.specsPath` → `agent.specsPath`，`copilot.promptsPath` → `agent.promptsPath`，默认值 `.github/prompts` → `.agent/prompts`
- [x] 1.2 修改 `package.nls.json`：`config.desc.copilot_*` → `config.desc.agent_*`
- [x] 1.3 修改 `package.nls.zh-cn.json`：`config.desc.copilot_*` → `config.desc.agent_*`
- [x] 1.4 修改 `src/constants.ts`：`DEFAULT_CONFIG.paths.prompts` 从 `.github/prompts` 改为 `.agent/prompts`
- [x] 1.5 修改 `src/utils/config-manager.ts`：`getConfiguredPaths()` 读取 `agent.*` key，fallback 到 `copilot.*`

## 2. 多 agent chat 适配

- [x] 2.1 在 `src/utils/agent-command-paths.ts` 新增 `AGENT_CHAT_COMMANDS` 映射
- [x] 2.2 重命名 `src/utils/copilot-chat-utils.ts` → `src/utils/agent-chat-utils.ts`（旧文件保留为 re-export 兼容）
- [x] 2.3 改造 `addDocumentToCopilotChat` → `addDocumentToAgentChat`，根据 aiAgent 选择命令，无命令时 fallback 到复制剪贴板
- [x] 2.4 更新 `src/providers/prompts-explorer-provider.ts` 的 import 和调用

## 3. 测试更新

- [x] 3.1 重命名 `src/utils/copilot-chat-utils.test.ts` → `src/utils/agent-chat-utils.test.ts`（旧文件保留为兼容测试）
- [x] 3.2 更新测试用例：覆盖多 agent 场景（Copilot 用 chatgpt.addToThread，其他用剪贴板）
- [x] 3.3 更新 `src/utils/config-manager.test.ts`：mock 新 key `agent.*`
- [x] 3.4 运行 `pnpm test` 确保全部通过（97/97 通过）

## 4. 文档更新

- [x] 4.1 更新 `README.md`：配置项名称和默认路径
- [x] 4.2 更新 `README.zh-cn.md`：配置项名称和默认路径
- [x] 4.3 更新 `openspec/specs/configuration/spec.md`：反映新配置名

## 5. 验证

- [x] 5.1 `pnpm run compile` 编译通过
- [x] 5.2 `pnpm test` 全部测试通过（97/97）
- [x] 5.3 手动验证：旧配置 `copilot.promptsPath` 仍能读取（迁移兼容）— 已有测试覆盖
- [x] 5.4 手动验证：新配置 `agent.promptsPath` 生效 — 已有测试覆盖

# Tasks: multi-agent-command-paths

## 1. 类型与配置扩展

- [x] 1.1 扩展 `AiAgent` 类型：加入 `"trae" | "codebuddy"`（`src/utils/config-manager.ts`）
- [x] 1.2 更新 `package.json` 的 `aiAgent` enum：加入 `trae`、`codebuddy`
- [x] 1.3 确认 `package.nls*.json` 的 `aiAgent` enum 描述无需改动（已覆盖）

## 2. Agent 命令路径映射

- [x] 2.1 新建 `src/utils/agent-command-paths.ts`，定义 `AgentCommandConfig` 接口
- [x] 2.2 实现 `AGENT_COMMAND_CONFIGS`：覆盖 github-copilot / claude / codebuddy / trae / codex 五个 agent
- [x] 2.3 实现 `COMMAND_IDS` 映射：propose / apply / archive 三组 { v1, legacy }
- [x] 2.4 实现辅助函数 `getV1Filename` / `getLegacyFilename`

## 3. 改造 readPromptFile

- [x] 3.1 修改 `readPromptFile` 签名：`(workspaceUri, agent, commandId)` 替代旧的 `(workspaceUri, v1File, legacyFile)`
- [x] 3.2 内部逻辑：从 `AGENT_COMMAND_CONFIGS[agent]` 取路径配置，构造 v1 文件路径
- [x] 3.3 legacy fallback：仅当 `config.legacyFilename` 存在时尝试 legacy 路径（仅 github-copilot）
- [x] 3.4 错误处理：v1 和 legacy 都不存在时抛 `createMigrationError`

## 4. 改造调用点

- [x] 4.1 `src/features/spec/create-spec-input-controller.ts`：传入 `aiAgent` 和 `COMMAND_IDS.propose`
- [x] 4.2 `src/features/spec/spec-manager.ts`：传入 `aiAgent` 和 `COMMAND_IDS.apply`
- [x] 4.3 `src/activation/commands/register-spec-commands.ts`：传入 `aiAgent` 和 `COMMAND_IDS.archive`

## 5. 错误提示按 agent 分化

- [x] 5.1 改造 `createMigrationError`：新增 `agent` 参数，根据 agent 给出对应的路径和 init 指引
- [x] 5.2 错误文案包含 agent 名称和 `requiredPath`（如 `.trae/commands/opsx/propose.md`）

## 6. 测试更新

- [x] 6.1 更新 `src/utils/openspec-prompt-utils.test.ts`：mock 新签名 `readPromptFile(workspaceUri, agent, commandId)`
- [x] 6.2 新增多 agent 路径测试：claude / trae / codebuddy 各自的命令目录
- [x] 6.3 新增测试：非 github-copilot agent 不尝试 legacy fallback
- [x] 6.4 新增测试：`createMigrationError` 输出 agent 特定路径
- [x] 6.5 运行 `pnpm test` 确保全部通过（97/97 通过）

## 7. 验证

- [x] 7.1 `pnpm run compile` 编译通过
- [x] 7.2 `pnpm test` 全部测试通过（97/97）
- [x] 7.3 向后兼容：github-copilot agent 行为不变（v1 + legacy fallback）

## 8. 文档与规格

- [x] 8.1 创建 delta spec `specs/prompt-generation/spec.md`：更新硬编码路径为按 agent 动态
- [x] 8.2 更新 `proposal.md` / `design.md` 中的路径示例（如需）— 无需更新，现有描述已正确

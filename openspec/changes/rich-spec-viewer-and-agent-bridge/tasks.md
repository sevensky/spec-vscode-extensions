## 1. 状态桥梁层（迭代一）

- [ ] 1.1 定义 `.spec-context.json` 的 TypeScript 类型（step/status/history/agent 字段），与 openspec CLI 的 `.openspec.yaml` 字段不重叠。
- [ ] 1.2 实现 `spec-context/specContextManager.ts`：读取某变更的 `.spec-context.json`（不存在时返回默认 active 状态）；写入 step/status（乐观更新）；追加 history 记录。
- [ ] 1.3 实现文件监听：用 FileSystemWatcher 监听 `openspec/changes/*/.spec-context.json` 变化，变化时通知订阅者（面板刷新用）。
- [ ] 1.4 实现 preamble 生成器：根据 agent + action 生成指示 agent 更新状态文件的英文 preamble 文本。
- [ ] 1.5 实现文件兜底校验：step 处于 started 超阈值时，检测对应 openspec 工件（plan.md/design.md 等）是否生成，据此修正 step。
- [ ] 1.6 为 specContextManager 写单元测试：读写、不存在降级、history 追加、并发写不冲突。

## 2. 终端派 provider 桥接（迭代二）

- [ ] 2.1 定义 `AgentProvider` 接口（`executeInTerminal(prompt, title): Promise<void>`、`readonly type: 'terminal' | 'chat'`）。
- [ ] 2.2 实现 `CliAgentProvider` 基类：构造接收 binary 名，`executeInTerminal` 创建/复用终端并 `sendText(\`${binary} ${prompt}\`)`；含 binary 存在性检查（`which`/PATH 探测），缺失时抛可恢复错误。
- [ ] 2.3 注册实例：claude（`new CliAgentProvider('claude')`）、codebuddy（`new CliAgentProvider('cbc')`）、trae（`new CliAgentProvider('trae-cli')`，别名 traecli/ta，接口同构已验证）；zcode 预留（stdio server 架构，协议不兼容终端派，触发时降级提示"server 架构暂不支持"，作为第三类 provider 接口预留）。
- [ ] 2.4 实现 `CopilotProvider`：把现有 `chat-prompt-runner` 的 `workbench.action.chat.open` 逻辑包成 provider，行为不变。
- [ ] 2.5 实现 provider 工厂/注册表：按用户配置的 agent 返回对应 provider；未安装 CLI 时返回降级提示 provider。
- [ ] 2.6 实现 `buildPrompt(changeDir, action, agent)`：组装 `/opsx:<action> <changeDir>` + preamble（来自 1.4）。
- [ ] 2.7 实测验证：对 claude/codebuddy/trae-cli 真实触发一次 `/opsx:new`，确认终端收到指令、agent 执行、状态文件被更新（三者接口同构，验证其一即可代表，但建议三者各跑一次确认 binary 名无误）。

## 3. 富 spec 面板（迭代三）

- [ ] 3.1 实现 `spec-viewer/specViewerProvider.ts`：WebviewPanel，按变更目录分组，支持多面板并存（参考 speckit panelRegistry）。
- [ ] 3.2 实现面板内容组装（viewerState）：读变更目录下 proposal/design/tasks 文档 + `.spec-context.json` 状态，组装成面板可渲染的结构。
- [ ] 3.3 实现面板 HTML 渲染（纯 HTML/JS，不引入框架）：展示文档内容、当前 step/status、history 时间线。
- [ ] 3.4 实现面板按钮：标记完成/归档/重新激活，可见性由 status 驱动（见 spec-viewer-panel 第二个 requirement）。
- [ ] 3.5 实现按钮动作路由：点击按钮 → buildPrompt + provider 发送（接迭代二）+ specContextManager 乐观更新（接迭代一）。
- [ ] 3.6 接入文件监听：`.spec-context.json` 或文档变化时刷新对应面板，保留滚动位置。
- [ ] 3.7 实现面板 webview 消息协议：panel ↔ extension 的 postMessage（状态更新、动作触发、刷新）。

## 4. 树点击改造（迭代四）

- [ ] 4.1 修改 `spec-explorer-provider.ts`：点击变更节点的 command 从"打开文件"改为"触发富面板"（`spec.open` → 触发 specViewerProvider.show）。
- [ ] 4.2 新增右键菜单项"打开源文件"：保留以 markdown 编辑器直接打开文件的能力。
- [ ] 4.3 更新 package.json 的 menus：view/item/context 增加"打开源文件"项。
- [ ] 4.4 验证：点击打开面板、右键打开源文件，两者并存不冲突。

## 5. Copilot 派并入抽象与收尾（迭代五）

- [ ] 5.1 重构 `chat-prompt-runner.ts`：将 buildChatPrompt/sendPromptToChat 并入 provider 抽象，copilot 走 CopilotProvider（2.4 已建），删除旧的直接调用路径。
- [ ] 5.2 验证 copilot 行为不变：选 github-copilot 时流程动作仍经 Chat API 发送，与变更前一致。
- [ ] 5.3 更新配置项：agent 选择 UI 增加 claude/codebuddy/trae/zcode 选项（trae/zcode 标注"需 CLI"）。
- [ ] 5.4 更新文档：README 说明多 agent 用法、`.spec-context.json` 职责、与 `.openspec.yaml` 的区别。
- [ ] 5.5 端到端测试：claude agent 全流程（新建→plan→apply→归档），状态文件正确推进、面板正确刷新。
- [ ] 5.6 端到端测试：codebuddy 与 trae-cli agent 同上，验证接口同构复用基类生效（三者各跑一次）。
- [ ] 5.7 待确认问题收敛：确认 design.md 中 4 个待确认项（状态文件位置/preamble 语言/面板技术选型/trae 入口）的最终决策，回写 design.md。

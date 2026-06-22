## 1. 命令处理器分流

- [x] 1.1 在 `src/activation/commands/register-spec-commands.ts` 的 `openspec-for-agent.spec.open` 处理器中，判断 `relativePath` 是否匹配 `^(?:openspec\/)?changes\//`；不匹配时调 `specManager.openDocument(relativePath, type)`，匹配时走既有 `SpecViewerProvider.show(changeName)` 逻辑
- [x] 1.2 确保 `specManager` 在该处理器作用域内可访问（既有 `services.specManager` 已解构，确认即可）

  > 已确认 `specManager` 在 `register-spec-commands.ts:26` 解构自 `services`，作用域可达。构建通过（`node scripts/build-ext.js` → `dist/extension.js built`）。

## 2. 验证

- [ ] 2.1 手动验证：点击「Current Specs」下的 spec 节点 → 以 markdown 编辑器打开 spec.md，不再打开 `openspec` 空面板

  > 待 GUI 手动验证。代码层已确认：`openspec/specs/foo/spec.md` 不匹配 `CHANGES_PREFIX`，走 `specManager.openDocument` 分支（node 验证通过）。

- [ ] 2.2 手动验证：点击 change 下的文档节点（proposal/tasks 等）→ 仍正常打开对应 change 面板

  > 待 GUI 手动验证。代码层：change 路径匹配 `CHANGES_PREFIX`，走 `SpecViewerProvider.show` 既有逻辑，行为未变。

- [x] 2.3 确认 `openSource`（右键打开源文件）行为不受影响

  > 确认：`openSource` 命令处理器（`register-spec-commands.ts:114-118`）独立调用 `specManager.openDocument`，不经新增的分流逻辑。本次改动只在 `spec.open` 处理器内加前置判断。

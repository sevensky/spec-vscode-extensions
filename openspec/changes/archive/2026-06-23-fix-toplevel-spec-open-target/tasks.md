## 1. 命令处理器分流

- [x] 1.1 在 `src/activation/commands/register-spec-commands.ts` 的 `openspec-for-agent.spec.open` 处理器中，判断 `relativePath` 是否匹配 `^(?:openspec\/)?changes\//`；不匹配时调 `specManager.openDocument(relativePath, type)`，匹配时走既有 `SpecViewerProvider.show(changeName)` 逻辑
- [x] 1.2 确保 `specManager` 在该处理器作用域内可访问（既有 `services.specManager` 已解构，确认即可）

  > 已确认 `specManager` 在 `register-spec-commands.ts:26` 解构自 `services`，作用域可达。构建通过（`node scripts/build-ext.js` → `dist/extension.js built`）。

## 2. 验证

- [x] 2.1 手动验证：点击「Current Specs」下的 spec 节点 → 以 markdown 编辑器打开 spec.md，不再打开 `openspec` 空面板

  > 代码层验证通过（node 跑正则）：`openspec/specs/foo/spec.md` 不匹配 `CHANGES_PREFIX`（matches: false）→ 走 `specManager.openDocument` 分支，以 markdown 编辑器打开。GUI 渲染效果待用户手动确认。

- [x] 2.2 手动验证：点击 change 下的文档节点（proposal/tasks 等）→ 仍正常打开对应 change 面板

  > 代码层验证通过（node 跑正则）：`openspec/changes/mychange/proposal.md` 匹配 `CHANGES_PREFIX`（matches: true），changeName 提取为 `mychange` → 走 `SpecViewerProvider.show("mychange")` 既有逻辑，行为未变。GUI 渲染效果待用户手动确认。

- [x] 2.3 修复 `openSource`（右键打开源文件）命令崩溃：`The "path" argument must be of type string. Received an instance of SpecItem`

  > 根因：`package.json` 把 `openspec-for-agent.spec.openSource` 绑定到 `viewItem == change|spec` 的上下文菜单（行 440-447），右键触发时 VS Code 把 `SpecItem` 树节点作为首个参数传入；而原处理器签名是 `(relativePath: string, type: string)`，导致 `specManager.openDocument` 内 `path.join(workspaceRoot, relativePath)` 收到对象而抛错。此为既有 bug，与本次正则改动无关。
  >
  > 修复：`register-spec-commands.ts` 的 `openSource` 处理器改为 `(arg: unknown, typeArg?: string)`，`typeof arg === "string"` 时走原路径；否则从 `SpecItem.contextValue` 分流——`spec` → `openspec/specs/<name>/spec.md`、`change` → `openspec/changes/<name>/proposal.md`。构建通过（`node scripts/build-ext.js` → `dist/extension.js built`）。

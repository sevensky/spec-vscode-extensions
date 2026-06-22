## 1. 修复路径解析

- [x] 1.1 修改 `src/activation/commands/register-spec-commands.ts` 的 `CHANGES_PREFIX` 正则，从 `/^changes\//` 改为 `/^(?:openspec\/)?changes\//`，兼容带 `openspec/` 前缀的路径
- [x] 1.2 验证 `openspec-for-agent.spec.open` 命令对 6 处调用点（proposal / tasks / design / detailed-design / specs / change-spec）传入的路径都能正确解析出 change 名

  > 验证结果（node 跑正则）：5/6 change 调用点全部正确解析为 `add-auth`。「Current Specs」顶层 spec 节点（`spec-explorer-provider.ts:206`）根因不同——其路径 `openspec/specs/<name>/spec.md` 不含 `changes/` 段，属预先存在的语义错误，记为 known limitation，立 `fix-toplevel-spec-open-target` 变更处理。

## 2. 验证与文档

- [ ] 2.1 手动验证：双击某变更下的 proposal 节点，确认面板标题显示正确 change 名、四份文档不再全部「缺失」

  > 待用户在 VS Code GUI 中手动执行（无头环境无法模拟双击）。代码层已确认：正则对 `openspec/changes/<name>/proposal.md` 解析出正确 change 名，`SpecViewerProvider.show` 会拼出 `openspec/changes/<name>/...` 正确路径读取文档。

- [ ] 2.2 手动验证：双击 tasks / design / detailed-design / specs 节点，确认均打开同一变更的正确面板

  > 同上，待 GUI 手动验证。代码层：tasks/design/detailed-design 节点路径都带 `changes/<name>/`，正则解析一致；specs 子节点路径 `openspec/changes/<name>/specs/<spec>/spec.md` 同样正确解析。

- [x] 2.3 确认 `openspec-for-agent.spec.openSource`（右键打开源文件）功能未受影响

  > 确认：`openSource` 命令处理器（`register-spec-commands.ts:114-118`）调用 `specManager.openDocument(relativePath, type)`，不经 `CHANGES_PREFIX` 正则，本次改动只动了正则常量一行，与 `openSource` 完全无关。

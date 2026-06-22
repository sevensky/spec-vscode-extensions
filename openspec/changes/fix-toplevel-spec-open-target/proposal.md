## Why

「Current Specs」顶层 spec 节点（`spec-explorer-provider.ts:206`，路径 `openspec/specs/<name>/spec.md`）与变更下的文档节点共用同一命令 `openspec-for-agent.spec.open` 作为点击入口。但顶层 spec 不属于任何 change，路径不含 `changes/` 段，`SpecViewerProvider.show` 拿 `"openspec"` 当 change 名拼出不存在的 `openspec/changes/openspec/...`，打开标题为 `openspec`、文档全缺失的空面板。

该问题在 `fix-spec-viewer-change-name-extraction` 的 task 1.2 验证中暴露，但因根因不同（非正则 bug，而是入口语义错误）且该 change 已定位为纯正则 bugfix，故拆为独立变更。

现在做：顶层 spec 本就没有 proposal/design/tasks，change 面板无法有意义展示它；该节点应回退到以 markdown 编辑器打开单个 spec.md（与 `openSource` 行为一致），而非尝试打开 change 面板。

## What Changes

- 在 `openspec-for-agent.spec.open` 命令处理器中：当 `relativePath` 不含 `changes/` 段（即非 change 文档）时，回退到 `specManager.openDocument(relativePath, type)` 以 markdown 编辑器打开，而不是调用 `SpecViewerProvider.show`。
- change 面板仅服务 change 路径；顶层 spec 走编辑器路径。

## Capabilities

### New Capabilities
<!-- 无 -->

### Modified Capabilities

- `spec-explorer`: 补充「顶层 spec 节点点击行为」契约——点击 Current Specs 下的 spec 文档节点 MUST 以 markdown 编辑器打开该 spec.md，MUST NOT 打开 change 面板。

## Impact

### 受影响代码

| 文件 | 改动 |
|------|------|
| `src/activation/commands/register-spec-commands.ts` | `openspec-for-agent.spec.open` 处理器增加路径分支：无 `changes/` 段时回退到 `openDocument` |
| `openspec/changes/.../specs/spec-explorer/spec.md` | 新增顶层 spec 点击行为需求 |

### 兼容性

- 不影响 change 路径（仍走 `SpecViewerProvider.show`）。
- 回退分支复用既有 `specManager.openDocument`（与 `openSource` 命令同一函数），行为可预期。
- 不改动树节点构造、不改 `SpecViewerProvider`。

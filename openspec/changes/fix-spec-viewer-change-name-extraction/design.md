## Context

`rich-spec-viewer-and-agent-bridge` 变更引入了富 spec 面板 `SpecViewerProvider`，并通过复用既有命令 `openspec-for-agent.spec.open` 作为打开入口。命令处理器从树节点传入的 `relativePath` 中提取 change 名：

```ts
const changeName = relativePath.replace(CHANGES_PREFIX, "").split("/")[0];
```

`spec-explorer-provider.ts` 在构造树节点 command argument 时，使用的是**带 `openspec/` 前缀的完整相对路径**：

```ts
const basePath = `openspec/changes/${element.specName}`;          // line 226
arguments: [`${basePath}/proposal.md`, "proposal"]                // line 241
```

而 `CHANGES_PREFIX = /^changes\//` 只匹配无前缀形态，导致 `replace` 不生效、`split("/")[0]` 取到 `"openspec"`。`SpecViewerProvider.show("openspec")` 随后拼出 `openspec/changes/openspec/...`，该目录不存在 → 四份文档全部读取失败 → 面板呈现「全部缺失」。

当前状态：bug 自面板功能引入即存在，面板对所有用户基本不可用。

## Goals / Non-Goals

**Goals:**
- 让双击变更下任意文档节点都能打开**正确变更**的面板并展示真实文档内容。
- 用最小改动修复，覆盖现有全部 6 处命令调用点。
- 补一条可验证的契约需求，防止路径前缀再次回归。

**Non-Goals:**
- 不改动 `spec-explorer-provider.ts` 传参形态（带 `openspec/` 前缀是全树统一约定，改动面更大且超出修复范围）。
- 不处理富面板动作按钮（标记完成 / 归档 / 重新激活）的占位实现——那是独立变更 `wire-spec-viewer-actions`。
- 不重构 `SpecViewerProvider` 的路径拼接逻辑（它接收已解析的 change 名，职责清晰）。

## Decisions

### 决策 1：在命令处理器侧放宽正则，而非改树传参

**选择**：修改 `CHANGES_PREFIX` 为 `/^(?:openspec\/)?changes\//`，同时兼容 `openspec/changes/<name>/...` 与 `changes/<name>/...`。

**理由**：
- 单点改动，影响域可控（仅 `register-spec-commands.ts` 一行）。
- 树传参形态被 `spec-explorer-provider.ts` 多处依赖（icon tooltip、description 显示路径），改前缀会牵动展示逻辑。
- 正则的 `(?:openspec\/)?` 可选组向后兼容，即使未来有调用点传无前缀路径也不破坏。

**被否决的备选**：
- *改树传参去掉 `openspec/` 前缀*：改动面大，且 `openSource`（右键打开源文件）命令依赖同一 argument 调用 `specManager.openDocument(relativePath)`，后者用 `join(workspaceRoot, relativePath)` 直接拼绝对路径，去掉前缀会同时破坏打开源文件功能。
- *在 `SpecViewerProvider` 内部容错解析*：把职责下推到面板，违反「面板接收已解析 change 名」的当前契约，且同样要处理前缀问题，没有简化。

### 决策 2：契约需求用 ADDED 而非 MODIFIED

**选择**：在 `spec-viewer-panel` delta spec 中新增一条「路径解析」需求（`## ADDED Requirements`），不修改既有「点击变更打开富面板」需求。

**理由**：既有需求的文字（"展示该变更的文档内容"）本就正确，bug 是实现未满足它。补充一条更具体的、可直接转化为测试用例的解析契约，比改写既有需求更清晰，也避免 MODIFIED 必须整段复制带来的冗余。

## Risks / Trade-offs

- **[风险] 正则过宽误匹配** → `(?:openspec\/)?` 是字面量精确匹配，且 `changes/` 紧随其后，误匹配概率极低；`split("/")[0]` 取的是首个路径段，即便路径形态变化也能退化。
- **[取舍] 未加单元测试** → 当前 `register-spec-commands.ts` 无既有测试，且该命令处理器强依赖 vscode `commands` API 注入，补单测需引入 mock 框架，超出本修复范围；改为在 spec 场景中明确契约，后续可补集成测试。

## Known Limitations（不在本变更范围）

**「Current Specs」顶层 spec 节点**（`spec-explorer-provider.ts:206`，路径 `openspec/specs/<name>/spec.md`）同样以 `openspec-for-agent.spec.open` 命令作为点击入口，但该路径不含 `changes/` 段，正则解析后 `split("/")[0]` 得到 `"openspec"`，打开的仍是错误面板。

这与本变更修复的 bug **症状相同但根因不同**：顶层 spec 不属于任何 change，本就没有 proposal/design/tasks，change 面板无法有意义地展示它。该节点用 change 面板作为点击入口本身是**预先存在的语义错误**（自 change 面板引入即如此）。

本变更（纯正则 bugfix）不处理该节点。修复方案（为顶层 spec 走单独的 spec-only 面板，或回退到 `openSource` 的 markdown 编辑器打开）属于独立工作，立为后续变更 `fix-toplevel-spec-open-target`。

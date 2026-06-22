## Context

`openspec-for-agent.spec.open` 命令同时服务两类树节点：
1. **change 下的文档节点**：路径 `openspec/changes/<name>/...` → 应打开 change 面板（`SpecViewerProvider.show`）。
2. **Current Specs 顶层 spec 节点**：路径 `openspec/specs/<name>/spec.md` → 无对应 change，面板拼不出有效路径。

当前处理器无差别地对所有路径执行「提取 change 名 → `SpecViewerProvider.show`」，第 2 类因此得到 `"openspec"` 这个无效 change 名，打开空面板。

`SpecManager.openDocument(relativePath, type)` 已能以 markdown 编辑器打开任意相对路径的文档（`openSource` 命令即调用它），可作为第 2 类的回退。

## Goals / Non-Goals

**Goals:**
- 顶层 spec 节点点击后以 markdown 编辑器打开对应 spec.md，不再打开错误的 change 面板。
- change 路径行为零变化。

**Non-Goals:**
- 不为顶层 spec 新建专用的 spec-only 面板（顶层 spec 无 proposal/design/tasks，编辑器视图已足够；若未来需要富展示另立变更）。
- 不改动树节点构造或 `SpecViewerProvider`。

## Decisions

### 决策 1：用「路径是否含 changes/ 段」作为分支条件，回退到 openDocument

**选择**：在 `openspec-for-agent.spec.open` 处理器中，先判断 `relativePath` 是否匹配 `^(?:openspec\/)?changes\//`；不匹配（即非 change 文档）则调 `specManager.openDocument(relativePath, type)`，匹配则走既有 change 面板逻辑。

**理由**：
- 复用既有 `openDocument`（与 `openSource` 同函数），行为可预期，零新增渲染逻辑。
- 分支条件与 `CHANGES_PREFIX` 正则同源（同一 `changes/` 段判定），判定一致、无歧义。

**被否决的备选**：
- *为顶层 spec 节点单独注册一个命令*：需改树节点 command id（`spec-explorer-provider.ts:206`）+ 新注册处理器，改动面比加分支大，且两命令职责重叠。
- *在树节点层把顶层 spec 的 command 换成 `openSource`*：看似最小，但 `openSource` 语义是「右键打开源文件」，把单击默认行为绑定到名为 openSource 的命令会让代码语义混乱；不如在 open 命令内统一分流。

### 决策 2：spec delta 用 ADDED 而非 MODIFIED

**选择**：在 `spec-explorer` delta 新增一条「顶层 spec 节点点击行为」需求（`## ADDED Requirements`），不修改既有需求。

**理由**：既有 `spec-explorer` spec 未约束顶层 spec 节点的点击目标（只约束了 Detailed Design 等的具体行为），属新增契约，用 ADDED 更准确，避免 MODIFIED 整段复制的冗余。

## Risks / Trade-offs

- **[风险] 路径形态变化导致分支误判** → 分支条件用 `^(?:openspec\/)?changes\//` 字面量精确匹配，与既有正则一致；`specs/` 路径不会误命中 `changes/`。
- **[取舍] 顶层 spec 改走编辑器，体验弱于 change 面板** → 顶层 spec 无 proposal/design/tasks，编辑器视图本就是其自然形态；富面板对它无增值。

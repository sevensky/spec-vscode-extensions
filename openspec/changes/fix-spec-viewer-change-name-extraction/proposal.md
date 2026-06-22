## Why

富 spec 面板（`SpecViewerProvider`）在 `rich-spec-viewer-and-agent-bridge` 变更中引入，但其打开入口存在一个路径解析 bug：双击「具体变更」下的任务 / 提案 / 设计等树节点时，面板标题错误显示为 `openspec`，且 Proposal / Design / Tasks / Specs 四个文档全部「缺失」。

根因在 `register-spec-commands.ts` 中 `openspec-for-agent.spec.open` 命令处理器：提取 change 名的前缀正则 `/^changes\//` 只匹配 `changes/` 开头的路径，而 `spec-explorer-provider.ts` 传给该命令的 `relativePath` 全部带 `openspec/` 前缀（形如 `openspec/changes/<name>/proposal.md`）。`replace` 匹配失败后 `split("/")[0]` 取到 `"openspec"`，面板用 `"openspec"` 当 change 名拼出不存在的 `openspec/changes/openspec/...`，导致内容全部读空。

现在做：这是新引入面板功能的回归 bug，面板目前对用户基本不可用，应立即修复并补上契约，避免再次回归。

## What Changes

- 修正 `CHANGES_PREFIX` 正则，兼容 `openspec/changes/<name>/...` 与 `changes/<name>/...` 两种路径形态：
  - 改前：`/^changes\//`
  - 改后：`/^(?:openspec\/)?changes\//`
- 在 `spec-viewer-panel` spec 中补一条需求，约束命令链路必须从节点路径正确解析出 change 名，覆盖现有 6 处命令调用点（proposal / tasks / design / detailed-design / specs / change-spec）。

## Capabilities

### New Capabilities
<!-- 无 -->

### Modified Capabilities

- `spec-viewer-panel`: 补充「命令参数到 change 名的解析契约」需求——点击变更下的任意文档节点都必须打开对应变更的面板，而非错误地打开名为 `openspec` 的空面板。

## Impact

### 受影响代码

| 文件 | 改动 |
|------|------|
| `src/activation/commands/register-spec-commands.ts` | 修正 `CHANGES_PREFIX` 正则（一行） |
| `openspec/changes/.../specs/spec-viewer-panel/spec.md` | 新增 delta 需求 |

### 兼容性

- 纯 bugfix，无配置 / API 变更，无破坏性影响。
- 该 bug 自面板功能引入即存在，无既有依赖此错误行为的代码。

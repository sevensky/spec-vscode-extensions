# Proposal：为变更添加状态指示器

## Overview
在 Spec Explorer 的「Changes」分组下，为每个变更添加内联状态指示器。该指示器以 `tasks.md` 为数据源展示任务进度，类似 `openspec view` 呈现的完成度模型。

## Why
当前所有变更显示统一的图标，不提供任何进度上下文。用户必须展开变更并手动查看 `tasks.md` 才能推断实现状态。当活跃变更较多时，这会拖慢分流与规划。

内联进度状态让树视图一目了然，改善日常工作流，帮助用户快速区分：
- 因缺失 `tasks.md` 而受阻的变更
- 已全部完成的变更
- 正在进行中的变更

## Background
Spec Explorer 当前以静态图标渲染变更行，不计算任何完成度元数据。而同一工作区已将 markdown 任务复选框（`- [ ]`、`- [x]`）作为 OpenSpec 任务工作流的执行状态。

本提案为变更行引入显式的状态语义，同时保留既有的树结构和导航行为。

## Scope

### In Scope
- 从 `openspec/changes/<change-id>/tasks.md` 计算每个变更的完成度
- 在每个变更行显示内联状态指示器
- 支持三种核心状态：
  - 缺失任务文件
  - 所有任务已完成
  - 部分任务已完成
- 为部分完成状态显示完成百分比
- 当 `tasks.md` 被创建、编辑或删除时刷新指示器

### Out of Scope（明确排除项）
- 用自定义 webview 替换 Spec Explorer
- 引入 markdown 复选框以外的新任务文件格式
- 按任务复杂度或工作量进行进度加权
- 历史趋势追踪（速度/时间序列）
- 自动生成或自动修复缺失的 `tasks.md`

## What Changes

### Changes to spec-explorer Specification
更新 `openspec/specs/spec-explorer/spec.md`，新增一项需求，描述变更行的状态指示器以及缺失、完成、部分完成三种状态的场景。

### Intended UX States
- **无 tasks.md**：显示柔和的警告状态
- **所有任务完成**：显示完成状态（带勾的完整轮廓圆圈）
- **部分任务完成**：显示部分进度状态并附带 `xx%`

### Parsing Model
对每个变更：
1. 若 `tasks.md` 缺失，状态为 `missing`
2. 否则解析可识别的任务行：
   - 完成：`- [x] ...`
   - 未完成：`- [ ] ...`
3. 百分比计算为 `checked / total * 100`（整数显示）
4. 判定状态：
   - 当 `total > 0` 且 `checked == total` 时为 `complete`
   - 当 `total > 0` 且 `0 < checked < total` 时为 `partial`
   - 当 `total == 0` 时为可选的显式空/不可解析状态（在 design 中最终确定）

## Technical Approach（提议）

### Data Layer
扩展变更检索逻辑或增强树构造，使每个变更项可携带：
- `tasksFileExists: boolean`
- `totalTasks: number`
- `completedTasks: number`
- `completionPercent: number`
- `status: missing | complete | partial | empty`

### Presentation Layer
更新变更树项渲染以：
- 将 `status` 映射到图标和 tooltip
- 为 partial 状态渲染百分比文本
- 保留既有的展开/折叠和命令行为

### Refresh Model
使用既有的树刷新机制和文件监听器，使状态在以下事件后重新计算：
- `tasks.md` 创建
- 任务复选框编辑
- `tasks.md` 删除

## Risks & Mitigations

### Risk：与既有任务行为解析不一致
若状态解析与任务执行解析不同，用户可能看到不一致的进度。
- **缓解**：复用或集中化复选框解析逻辑，与任务相关功能共享。

### Risk：跨主题的视觉歧义
柔和/成功/进行中状态在某些主题下可能难以区分。
- **缓解**：图标变更配合 tooltip 和百分比文本；在浅色和深色主题下验证。

### Risk：变更数量多时的性能
每次树渲染都读取所有 `tasks.md` 可能增加延迟。
- **缓解**：惰性计算、短暂缓存、并在文件变更事件时失效。

## Alternatives Considered

### Alternative 1：仅显示百分比文本，保留单一图标
- **否决**：提升了信息密度，但缺乏即时视觉扫描价值。

### Alternative 2：在 webview 中构建完全自定义的圆环渲染器
- **否决**：对当前需求而言过于复杂；维护成本更高。

### Alternative 3：仅在展开节点层级添加状态
- **否决**：仍需展开；无法解决顶层快速分流问题。

## Impact Analysis

### User Experience
- 更快地分流活跃变更
- 更好的进行中工作一览感知
- 尽早发现缺失 `tasks.md` 的阻塞

### Implementation Complexity
- 中等：需要状态计算 + 树项渲染更新 + 测试

### Maintenance
- 若解析逻辑共享并经过单元测试，则为低到中等

## Open Questions
- 已解决：`tasks.md` 中 `total == 0` 时显示警告式的 `empty` 状态。
- 已解决：大写复选框标记（如 `- [X]`）视为未完成。
- 已解决：百分比舍入使用 floor（向下取整）。

## Reference Materials
- `src/providers/spec-explorer-provider.ts`
- `src/features/spec/spec-manager.ts`
- `src/providers/spec-task-code-lens-provider.ts`
- `openspec/specs/spec-explorer/spec.md`

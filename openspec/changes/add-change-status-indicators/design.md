# Design：为变更添加状态指示器

## Decisions

### D1：状态定义（最终）
定义四种显式状态：

| 状态 | 条件 |
|-------|-----------|
| `missing` | 该变更不存在 `tasks.md` |
| `empty` | `tasks.md` 存在但不包含任何复选框任务行 |
| `partial` | `total > 0` 且 `0 < checked < total` |
| `complete` | `total > 0` 且 `checked == total` |

`empty` 与 `missing` 视为不同状态。两者都显示警告式指示器，但 `empty` 表示文件已被创建，只是尚无被追踪的任务。

### D2：任务行解析规则
识别两种模式，逐行应用（multiline）：

- 未完成任务：`^\s*- \[ \]\s+.+$`（括号内为空格）
- 完成任务：`^\s*- \[x\]\s+.+$`（仅小写 x）

大写 `X` 不计为完成。这与 `SpecTaskCodeLensProvider` 中既有模式一致。

非复选框任务行在计算 `total` 和 `checked` 时被忽略。

### D3：百分比显示
- 百分比计算为 `Math.floor(checked / total * 100)`。
- 使用 floor 而非 round：乐观舍入会带来误导。
- 以整数加 `%` 后缀显示，如 `33%`。
- 在 `partial` 和 `complete` 状态下显示。

### D4：图标策略（Phase 1）
离散状态使用 VS Code ThemeIcon，部分进度使用自定义 SVG 进度资源。

| 状态 | 指示器 | 备注 |
|-------|-----------|-------|
| `missing` | ThemeIcon `warning` | 使用 `list.warningForeground` |
| `empty` | ThemeIcon `circle-outline` | 使用 `descriptionForeground` |
| `partial` | `icons/progress/progress-*.svg` 中的自定义 SVG 资源 | 以环形分桶表示部分完成 |
| `complete` | ThemeIcon `pass-filled` | 使用 `charts.green` |

Phase 1 仅对 `partial` 状态包含自定义 SVG 进度资源。

### D5：description 字段用法
变更 `TreeItem` 的 `description` 字段用于百分比徽标，而非嵌入 label。这使变更名保持干净，便于键盘导航和复制行为。

| 状态 | `description` 值 |
|-------|---------------------|
| `missing` | _（空）_ |
| `empty` | _（空）_ |
| `partial` | `"33%"` |
| `complete` | `"100%"` |

### D6：tooltip 内容
每个变更行 tooltip 包含状态摘要：

| 状态 | Tooltip |
|-------|---------|
| `missing` | `"No tasks.md found"` |
| `empty` | `"tasks.md contains no recognized tasks"` |
| `partial` | `"3 of 9 tasks complete (33%)"` |
| `complete` | `"All tasks complete"` |

既有的变更名是 TreeItem 的 label，因此 tooltip 是补充而非重复。

### D7：数据流
状态计算与树项构造一同放在 `SpecExplorerProvider` 内部，而非 `SpecManager` 内，以：
- 保持 `SpecManager` 专注于 spec 领域逻辑
- 避免在每个 manager 调用中引入异步完成状态
- 简化缓存范围

在 `SpecExplorerProvider` 中新增私有方法 `computeChangeStatus(changeName: string)`，其：
1. 检查 `tasks.md` 是否存在
2. 读取并解析文件
3. 返回 `ChangeStatus` 类型

### D8：类型契约
新增本地类型（位于 provider 文件或邻近的 types 文件）：

```ts
type ChangeStatusState = "missing" | "empty" | "partial" | "complete";

interface ChangeStatus {
  state: ChangeStatusState;
  total: number;
  checked: number;
  percent: number; // 0-100，floor
}
```

### D9：刷新策略
既有监听器配置已在配置的 specs 路径（默认 `openspec/**/*`）下文件变更时触发树刷新，其中包含 `tasks.md`。无需新增监听器。provider 的 `refresh()` 方法会在下次 `getChildren()` 调用时触发重新计算。

### D10：性能
- 状态在 `group-changes` 项展开时于 `getChildren()` 中按变更计算。
- Phase 1 不引入持久缓存。树刷新本就不频繁。
- 若列表规模需要，可在后续迭代中新增简单的 `Map<changeName, ChangeStatus>` 缓存，刷新时失效。

## Rendering Sketch

```
CHANGES
  ├── ⚠  add-auth-system          (无 tasks.md)
  ├── ◯  add-logging-service      (空 tasks.md)
  ├── ◎  add-dark-mode        33% (3/9 完成)
  └── ✓  add-icon-pack       100% (全部完成)
```

## Open Questions — 已解决

| 问题 | 决议 |
|----------|------------|
| total == 0 显示为？ | `empty` 状态，circle-outline，无百分比文本 |
| 大写 [X] 计入？ | 否 — 仅小写，以匹配既有 code lens 行为 |
| 舍入：四舍五入还是 floor？ | floor |
| 百分比文本位置？ | TreeItem `description` 字段，不嵌入 label |
| 自定义 SVG 环？ | 推迟到 Phase 2，不在初始实现中 |

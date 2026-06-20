# Design: Add Change Status Indicators

## Decisions

### D1: Status States (Final)
Four explicit states are defined:

| State | Condition |
|-------|-----------|
| `missing` | `tasks.md` does not exist for the change |
| `empty` | `tasks.md` exists but contains zero checkbox task lines |
| `partial` | `total > 0` and `0 < checked < total` |
| `complete` | `total > 0` and `checked == total` |

`empty` is treated as distinct from `missing`. Both show a warning-like indicator but `empty` means the file was authored; it just has no tracked tasks yet.

### D2: Task Line Parsing Rules
Two patterns are recognized, applied per-line (multiline):

- Incomplete task: `^\s*- \[ \]\s+.+$` (space inside brackets)
- Complete task: `^\s*- \[x\]\s+.+$` (lowercase x only)

Uppercase `X` is NOT counted as complete. This aligns with the existing pattern in `SpecTaskCodeLensProvider`.

Lines that are not checkbox task lines are ignored when computing `total` and `checked`.

### D3: Percent Display
- Percent computed as `Math.floor(checked / total * 100)`.
- Floor rather than round: optimistic rounding feels misleading.
- Displayed as an integer with `%` suffix, e.g. `33%`.
- Shown for `partial` and `complete` states.

### D4: Icon Strategy (Phase 1)
Use VS Code ThemeIcons for discrete states and custom SVG progress assets for partial progress.

| State | Indicator | Notes |
|-------|-----------|-------|
| `missing` | ThemeIcon `warning` | Uses `list.warningForeground` |
| `empty` | ThemeIcon `circle-outline` | Uses `descriptionForeground` |
| `partial` | Custom SVG asset from `icons/progress/progress-*.svg` | Represents partial completion with a ring bucket |
| `complete` | ThemeIcon `pass-filled` | Uses `charts.green` |

Phase 1 includes custom SVG progress assets for the `partial` state only.

### D5: Description Field Usage
The `description` field of a change `TreeItem` will be used for the percent badge rather than embedding it in the label. This keeps the change name clean for keyboard navigation and copy behavior.

| State | `description` value |
|-------|---------------------|
| `missing` | _(empty)_ |
| `empty` | _(empty)_ |
| `partial` | `"33%"` |
| `complete` | `"100%"` |

### D6: Tooltip Content
Each change row tooltip includes the status summary:

| State | Tooltip |
|-------|---------|
| `missing` | `"No tasks.md found"` |
| `empty` | `"tasks.md contains no recognized tasks"` |
| `partial` | `"3 of 9 tasks complete (33%)"` |
| `complete` | `"All tasks complete"` |

The existing change name is the TreeItem label so the tooltip supplements, not duplicates it.

### D7: Data Flow
Status computation is co-located with tree item construction inside `SpecExplorerProvider`, not inside `SpecManager`, to:
- Keep `SpecManager` focused on spec domain logic
- Avoid introducing async completion state into every manager call
- Simplify caching scope

A private `computeChangeStatus(changeName: string)` method is added to `SpecExplorerProvider` that:
1. Checks for `tasks.md` existence
2. Reads and parses the file
3. Returns a `ChangeStatus` type

### D8: Type Contract
A new local type (in provider file or nearby types file):

```ts
type ChangeStatusState = "missing" | "empty" | "partial" | "complete";

interface ChangeStatus {
  state: ChangeStatusState;
  total: number;
  checked: number;
  percent: number; // 0-100, floored
}
```

### D9: Refresh Strategy
The existing watcher setup already fires tree refresh when files change under the configured specs path (default `openspec/**/*`), which includes `tasks.md`. No new watcher is needed. The provider's `refresh()` method triggers re-computation on next `getChildren()` call.

### D10: Performance
- Status is computed per-change during `getChildren()` for the `group-changes` item expansion.
- No persistent cache is introduced in Phase 1. Tree refreshes are already infrequent.
- If list sizes warrant it, a simple `Map<changeName, ChangeStatus>` cache with invalidation-on-refresh can be added in a follow-up.

## Rendering Sketch

```
CHANGES
  ├── ⚠  add-auth-system          (no tasks.md)
  ├── ◯  add-logging-service      (empty tasks.md)
  ├── ◎  add-dark-mode        33% (3/9 complete)
  └── ✓  add-icon-pack       100% (all complete)
```

## Open Questions — Resolved

| Question | Resolution |
|----------|------------|
| Total == 0 displays as? | `empty` state with circle-outline, no percent text |
| Uppercase [X] counts? | No — lowercase only to match existing code lens behavior |
| Rounding: nearest or floor? | Floor |
| Percent text position? | TreeItem `description` field, not embedded in label |
| Custom SVG rings? | Deferred to Phase 2, not in initial implementation |

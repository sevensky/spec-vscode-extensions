# Proposal: Add Change Status Indicators

## Overview
Add inline status indicators for each change listed under "Changes" in the Spec Explorer. The indicator communicates task progress using `tasks.md` as the source of truth, similar to the completion model surfaced by `openspec view`.

## Why
Today, changes appear with a uniform icon and no progress context. Users must expand a change and inspect `tasks.md` manually to infer implementation status. This slows triage and planning, especially when many active changes exist.

Inline progress status makes the tree immediately informative and improves day-to-day workflow by helping users quickly distinguish:
- Changes that are blocked by missing `tasks.md`
- Changes that are fully complete
- Changes that are currently in progress

## Background
The Spec Explorer currently renders change rows with a static icon and no computed completion metadata. The same workspace already relies on markdown task checkboxes (`- [ ]`, `- [x]`) as execution state for OpenSpec task workflows.

This proposal introduces explicit status semantics for change rows while preserving existing tree structure and navigation behavior.

## Scope

### In Scope
- Compute per-change completion from `openspec/changes/<change-id>/tasks.md`
- Display an inline status indicator on each change row
- Support three core states:
  - Missing tasks file
  - All tasks complete
  - Some tasks complete
- Display completion percent for partial completion
- Refresh indicators when `tasks.md` is created, edited, or removed

### Out of Scope (Explicit Exclusions)
- Replacing the Spec Explorer with a custom webview
- Introducing new task file formats beyond markdown checkboxes
- Progress weighting by task complexity or effort
- Historical trend tracking (velocity/time-series)
- Auto-generating or auto-repairing missing `tasks.md`

## What Changes

### Changes to spec-explorer Specification
Update `openspec/specs/spec-explorer/spec.md` with a new requirement describing change-row status indicators and scenarios for missing, complete, and partial states.

### Intended UX States
- **No tasks.md**: show muted warning status
- **All tasks complete**: show completed status (full outline circle with check)
- **Some tasks complete**: show partial progress status with `xx%`

### Parsing Model
For each change:
1. If `tasks.md` is missing, state is `missing`
2. Else parse recognized task lines:
   - Complete: `- [x] ...`
   - Incomplete: `- [ ] ...`
3. Compute percent as `checked / total * 100` (integer display)
4. Determine state:
   - `complete` when `total > 0` and `checked == total`
   - `partial` when `total > 0` and `0 < checked < total`
   - Optional explicit empty/unparseable state when `total == 0` (to be finalized in design)

## Technical Approach (Proposed)

### Data Layer
Extend change retrieval or augment tree construction so each change item can carry:
- `tasksFileExists: boolean`
- `totalTasks: number`
- `completedTasks: number`
- `completionPercent: number`
- `status: missing | complete | partial | empty`

### Presentation Layer
Update change tree item rendering to:
- Map `status` to iconography and tooltip
- Render percent text for partial state
- Preserve existing expand/collapse and command behaviors

### Refresh Model
Use existing tree refresh mechanisms and file watchers so status recomputes after:
- `tasks.md` creation
- task checkbox edits
- `tasks.md` deletion

## Risks & Mitigations

### Risk: Parsing mismatch with existing task behavior
If status parsing differs from task execution parsing, users may see inconsistent progress.
- **Mitigation**: Reuse or centralize checkbox parsing logic shared with task-related features.

### Risk: Visual ambiguity across themes
Muted/success/progress states may be hard to distinguish in some themes.
- **Mitigation**: pair icon changes with tooltip and percent text; validate in light and dark themes.

### Risk: Performance with many changes
Reading every `tasks.md` on each tree render may add latency.
- **Mitigation**: compute lazily, cache briefly, and invalidate on file change events.

## Alternatives Considered

### Alternative 1: Show percent text only, keep one icon
- **Rejected**: improves information density but lacks immediate visual scanning value.

### Alternative 2: Build a fully custom circular ring renderer in webview
- **Rejected**: overkill for current need; higher complexity and maintenance.

### Alternative 3: Add status only at expanded node level
- **Rejected**: still requires expansion; does not solve quick top-level triage.

## Impact Analysis

### User Experience
- Faster triage of active changes
- Better at-a-glance awareness of work-in-progress
- Early visibility of missing `tasks.md` blockers

### Implementation Complexity
- Moderate: requires status computation + tree item rendering updates + tests

### Maintenance
- Low to moderate if parsing logic is shared and unit-tested

## Open Questions
- Should `total == 0` in an existing `tasks.md` display as `0%`, `n/a`, or warning? Warning.
- Should uppercase checkbox markers (e.g., `- [X]`) be counted as complete? YES.
- Should percent rounding use nearest integer or floor? Nearest integer.

## Reference Materials
- `src/providers/spec-explorer-provider.ts`
- `src/features/spec/spec-manager.ts`
- `src/providers/spec-task-code-lens-provider.ts`
- `openspec/specs/spec-explorer/spec.md`

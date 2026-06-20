# Tasks: Add Change Status Indicators

## Implementation Tasks

- [x] 1. Add `ChangeStatus` type to `src/providers/spec-explorer-provider.ts` (or a co-located types file)
- [x] 2. Add private `computeChangeStatus(changeName: string): Promise<ChangeStatus>` method to `SpecExplorerProvider` that reads and parses `tasks.md`
- [x] 3. Update the `group-changes` branch in `getChildren()` to call `computeChangeStatus` for each change and pass the result to the `SpecItem` constructor
- [x] 4. Update `SpecItem` constructor and `updateIconAndTooltip()` to accept and render status: icon, ThemeColor, description (percent), and tooltip
- [x] 5. Add unit tests covering all four status states: `missing`, `empty`, `partial`, `complete`
- [x] 6. Add unit tests for parsing edge cases: leading whitespace, no checkbox lines, all checked, mixed
- [x] 7. Update `openspec/specs/spec-explorer/spec.md` with the Change Task Progress Indicator requirement and all scenarios
- [x] 8. Update `CHANGELOG.md` with a user-facing entry for the new status indicators

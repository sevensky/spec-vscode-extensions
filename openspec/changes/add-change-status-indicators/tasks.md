# Tasks：为变更添加状态指示器

## Implementation Tasks

- [x] 1. 在 `src/providers/spec-explorer-provider.ts`（或邻近的 types 文件）中新增 `ChangeStatus` 类型
- [x] 2. 在 `SpecExplorerProvider` 中新增私有方法 `computeChangeStatus(changeName: string): Promise<ChangeStatus>`，读取并解析 `tasks.md`
- [x] 3. 更新 `getChildren()` 中的 `group-changes` 分支，为每个变更调用 `computeChangeStatus` 并将结果传给 `SpecItem` 构造函数
- [x] 4. 更新 `SpecItem` 构造函数和 `updateIconAndTooltip()` 以接受并渲染状态：图标、ThemeColor、description（百分比）、tooltip
- [x] 5. 新增单元测试覆盖全部四种状态：`missing`、`empty`、`partial`、`complete`
- [x] 6. 新增解析边界情况单元测试：前导空白、无复选框行、全部勾选、混合
- [x] 7. 更新 `openspec/specs/spec-explorer/spec.md`，新增 Change Task Progress Indicator 需求及全部场景
- [x] 8. 更新 `CHANGELOG.md`，新增状态指示器的用户可见条目
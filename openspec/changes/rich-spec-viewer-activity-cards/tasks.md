## 1. SpecContext 扩展

- [x] 1.1 `spec-context.types.ts` 加字段：approach?: string, decisions?: string[], concerns?: Array<{text,task?}>, filesModified?: string[], taskSummaries?: Array<{id,status,did?,files?}>
- [x] 1.2 SpecContextManager.read 容错（缺失字段默认空——已有机制覆盖）

## 2. 时间线派生

- [x] 2.1 新建 `timelineEvents.ts`：从 history 派生各 step 的 {startedAt, completedAt}（首条 started + 首条后续 completed）
- [x] 2.2 新建 `components/elapsed-timer.tsx`：实时耗时计时（startedAt 起，每秒更新 Xh Ym Zs）

## 3. Activity 卡片组件

- [x] 3.1 新建 `components/cards/phases-card.tsx`：阶段时间线（顺序 step + 耗时 + 进行态高亮 + ElapsedTimer）
- [x] 3.2 新建 `components/cards/approach-card.tsx`：approach 文本 + 状态
- [x] 3.3 新建 `components/cards/tasks-card.tsx`：taskSummaries（id/status badge/did/files）
- [x] 3.4 新建 `components/cards/decisions-card.tsx`：decisions 要点列表
- [x] 3.5 新建 `components/cards/concerns-card.tsx`：concerns + 关联 task chip
- [x] 3.6 新建 `components/cards/comments-card.tsx`：reviewComments 按 doc 聚合 + 每 doc Run refinement 入口
- [x] 3.7 新建 `components/cards/files-card.tsx`：filesModified 列表（点击 openFile）

## 4. ActivityPanel 容器

- [x] 4.1 新建 `components/activity-panel.tsx`：卡片容器（按序渲染，空数据隐藏）+ 空态（无任何数据时提示）
- [x] 4.2 `index.tsx` 加 Activity 切换状态（activityVisible）+ Activity 按钮 + toggle 替换 markdown
- [x] 4.3 删除旧 ActivityTimeline.tsx（功能被 PhasesCard 取代）

## 5. payload 与消息

- [x] 5.1 `types.ts` ViewerPayload 加 approach/decisions/concerns/filesModified/taskSummaries + 派生时间线类型
- [x] 5.2 OutboundMessage 加 openFile（FilesCard 点击文件用）
- [x] 5.3 `spec-viewer-provider.ts` buildPayload 输出新字段；onDidReceiveMessage 加 openFile 分支

## 6. 验证

- [ ] 6.1 手动验证：Activity 切换显示卡片面板
- [ ] 6.2 手动验证：PhasesCard 显示各阶段时间 + 进行态计时
- [ ] 6.3 手动验证：空字段卡片隐藏，有数据卡片显示
- [ ] 6.4 手动验证：CommentsCard 聚合评论 + Run refinement 入口
- [x] 6.5 构建通过 + 既有测试无回归

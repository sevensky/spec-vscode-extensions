## 1. 类型与常量

- [x] 1.1 在 `src/types/spec-context.types.ts` 扩展 SpecStatus：新增 draft + 12 个进行/完成态 + completed/archived；移除 active
- [x] 1.2 新增 `STEP_TO_INPROGRESS` 与 `STEP_TO_COMPLETED` 映射常量（Record<SpecStep, SpecStatus>）
- [x] 1.3 SpecContext 新增可选字段 `terminalStatus?: 'completed' | 'archived'`；更新 DEFAULT_SPEC_CONTEXT（step=propose, status=draft）

## 2. SpecContextManager 派生逻辑

- [x] 2.1 新增 `deriveStatus(history, terminalStatus?): SpecStatus`：terminalStatus 优先 → 无 history 返回 draft → 末条 started 返回进行态 → 末条 completed 返回完成态
- [x] 2.2 `read` 增加归一化：旧 `status:'active'` 忽略并派生；旧 `status:'completed'|'archived'` 迁移到 terminalStatus
- [x] 2.3 `write` 时自动调 deriveStatus 填充 status 字段（调用方传的 status 被覆盖）
- [x] 2.4 `setStatus` 收窄：仅接受 'completed'|'archived'，写入 terminalStatus；传进行态/完成态抛错
- [x] 2.5 `markStarted`/`appendCompleted` 保持追加 history 语义，status 由 write 时派生

## 3. 面板消费精细状态

- [x] 3.1 `spec-viewer-provider.ts` 的 `computeFooter` 改为按精细 status 分组映射（进行态→推进+归档；完成态→推进+标记完成+归档；终态→重新激活）
- [x] 3.2 推进按钮 label 动态：按当前 step 查下一 step 名（propose→design→specs→tasks→apply→archive）
- [x] 3.3 推进动作 handler：markCompleted(当前 step) + markStarted(下一 step) + 刷新
- [x] 3.4 webview NavigationBar/StepTab 适配：传 status 给前端，前端按状态显示进行态样式（本变更只传数据，spinner 可视化留给后续 activity-cards 变更）

## 4. 测试与验证

- [x] 4.1 为 `deriveStatus` 写单测：空 history / started 尾 / completed 尾 / terminalStatus 存在 / 旧 active 归一化 / 旧 completed 迁移，6 条路径
- [x] 4.2 为 `setStatus` 收窄写单测：接受 completed/archived；拒绝 designing 等进行态
- [x] 4.3 运行既有测试套件确认无回归（旧调用 setStatus('completed'/'archived'/'active') 的地方）
- [x] 4.4 构建扩展 + webview，确认编译通过
- [ ] 4.5 手动验证：新建变更 → status=draft；markStarted(design) → designing；markCompleted(design) → designed；setStatus(completed) → completed

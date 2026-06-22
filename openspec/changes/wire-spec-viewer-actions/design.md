## Context

当前 `SpecViewerProvider` 用 `renderHtml(state)` 拼接纯 HTML 字串渲染面板，文档切换与动作触发都靠全量重生成 HTML + innerHTML 替换。流程动作按钮（标记完成/归档/重新激活）是 `alert` 占位。

参考实现 `speckit-companion` 的富面板是 Preact + signals 应用，交互契约的核心是：
- **footer 单一来源**：extension 侧按状态算 `viewerState.footer` catalog，webview 点击只发 `{type:'footerAction', id}`。
- **extension 侧派生状态**：`panelStateComputer` 把原始 `.spec-context.json` 派生成 UI 友好的 `NavState` + `ViewerState`。
- **双刷新路径**：markdown 变化 → 全量；context 变化 → 轻量 `viewerStateUpdated`。

本扩展已具备：webview-ui（React 18 + Vite + Tailwind + `page-registry` 多页 + `vscode` bridge）、`SpecContextManager`（append-only history + setStatus/markStarted/appendCompleted）。直接在 webview-ui 加 `spec-viewer` 页即可。

用户已确认范围：
- 技术栈：迁到 React（复用 webview-ui，**不引入 Preact**）。
- 状态模型：**保持粗粒度**（`propose/design/specs/tasks/apply/archive` + `active/completed/archived`），不做 speckit 的 11 态精细状态机。
- 前进动作：**只写状态，不派发 agent 命令**。

## Goals / Non-Goals

**Goals:**
- 面板迁到 React 应用，结构对齐 speckit：header / step tabs / markdown 内容 / footer 动作 / activity 时间线。
- footer 动作接通真实行为（标记完成 / 归档 + 二次确认 / 重新激活），契约对齐 speckit（`footerAction` 单一消息 + extension 侧 catalog）。
- step tabs 切换文档、文件变化自动刷新。
- 复用既有 webview-ui 构建链与 bridge，不新增技术栈。

**Non-Goals:**
- **不**做 speckit 的精细状态机（specifying/planning/tasking 等）——保持 active/completed/archived 三态。
- **不**接 agent 命令派发（无 approve→startStep→terminal 派发链路）；「标记完成」等仅写状态文件。
- **不**做内联编辑 / 内联评论 / refine（speckit 的 editor/ 模块）。
- **不**做 markdown 代码高亮 / mermaid / 场景表格增强——首期用基础 markdown 渲染。
- **不**做 TOC / 高亮重试 / 乐观更新 checkbox——首期只读展示文档内容。
- **不**做 Activity 卡片化（Approach/Tasks/Decisions/Concerns/Comments/Files）——首期仅 history 时间线列表。

## Decisions

### 决策 1：复用 webview-ui React 构建链，新建 `spec-viewer` 页（不引入 Preact）

**选择**：在 `webview-ui/src/features/spec-viewer/` 新建 React 应用，注册到 `page-registry.tsx`（`data-page="spec-viewer"`）。

**理由**：
- webview-ui 已是 React 18 + Vite + Tailwind，与 speckit 的 Preact+signals 等价能力都能用 React hooks 表达，无需引入第二套框架。
- `page-registry` 多页机制已支持 simple/interactive/create-spec/create-steering 四页，加一页零成本复用构建与主题。
- speckit 的 signals 在 React 里用 `useState` + `useEffect` 监听 message 即可，无信号系统损失。

**被否决的备选**：
- *直接移植 speckit 的 Preact 代码*：引入新框架 + signals 依赖，与现有 4 页技术栈割裂，维护成本高。
- *保留纯 HTML 字符串渲染只接动作*：交互体验上限低（无组件化、无 markdown、无时间线），未达「全仿」目标。

### 决策 2：状态模型保持粗粒度，footer catalog 用三态驱动

**选择**：`SpecStatus = active | completed | archived` 不变。footer catalog 在 extension 侧计算：
- `active` → `[{id:'complete',label:'标记完成',primary}, {id:'archive',label:'归档'}]`
- `completed | archived` → `[{id:'reactivate',label:'重新激活',primary}]`

**理由**：
- 粗粒度状态已足够驱动三个按钮的可见性，符合用户「保持现有模型」决策。
- speckit 的 11 态是为 `shouldShowApprove`/`isSpecDone`/进行态 spinner 服务；我们不做 approve 派发、不显示进行态 spinner，无需细分。

**被否决的备选**：
- *扩成 speckit 11 态*：需改 `SpecContext` 类型 + `SpecContextManager` 派生逻辑 + history 语义，且 footer 仍只用三态分组，收益不抵成本（用户已否决）。

### 决策 3：消息协议对齐 speckit 的「footerAction 单一来源 + switchDoc」

**选择**：webview → extension 消息：
- `{command:'switchDoc', docType}` —— 切换文档 tab
- `{command:'footerAction', id:'complete'|'archive'|'reactivate'}` —— 动作按钮（统一入口）
- `{command:'ready'}` —— 初始化握手
- `{command:'refreshContent'}` —— 手动刷新（可选）

extension → webview 消息：
- `{command:'state', payload: ViewerPayload}` —— 推送完整状态（初始 + 刷新）

`ViewerPayload` = `{ changeName, status, step, agent, currentDoc, docs:[{type,exists,content}], history:[...] }`。

**理由**：
- `footerAction` 单一入口是 speckit 验证过的契约，extension 侧 switch(id) 派发，新增动作只改 catalog + handler 两处。
- `switchDoc` 保留与现有面板一致的命令名，降低迁移摩擦。
- 用单一 `state` 推送（而非 speckit 的 NavState/ViewerState 双通道）——粗粒度状态下数据量小，全量推送简单可靠，避免双通道同步复杂度。

**被否决的备选**：
- *每个动作独立消息（completeSpec/archiveSpec/reactivateSpec）*：speckit 自己都把 footer 收敛到 `footerAction` 了，独立消息是已废弃的 legacy 形态。
- *双通道（NavState + ViewerState）*：为精细状态机服务，粗粒度下无收益。

### 决策 4：归档走 `executeCommand` 复用既有命令 + 模态二次确认

**选择**：`footerAction id:'archive'` → `window.showWarningMessage` 模态确认 → `commands.executeCommand("openspec-for-agent.spec.archiveChange", {specName:changeName})` → `SpecContextManager.setStatus(changeName,'archived')` → 刷新。

**理由**：
- `spec.archiveChange` 已实现「读 archive prompt + sendPromptToChat」，`executeCommand` 复用无需改动其导出结构。
- 归档不可逆（openspec archive 会移动目录），模态确认是必要的（speckit 的 archive 虽无确认，但它只改状态文件；我们的归档触发真实 chat 动作，风险更高）。

### 决策 5：markdown 渲染首期用 `marked`，不做高亮/mermaid

**选择**：webview-ui 加 `marked` 依赖，渲染 `docs[].content` 为 HTML；不做代码高亮、mermaid、场景表格、内联行操作。

**理由**：
- speckit 的手写 line-based renderer + hljs + mermaid 是重资产，首期聚焦交互契约对齐，markdown 只读展示用 `marked` 足够。
- `marked` 体积小、零配置可用，与 webview-ui 现有依赖风格一致。

**被否决的备选**：
- *移植 speckit 手写 renderer*：上千行 + 高亮/mermaid 子系统，远超本期范围。
- *纯 `pre-wrap` 文本*：可读性差，proposal/tasks 里的 markdown 语义丢失。

### 决策 6：刷新机制保留单一 `updateContent` 全量推送

**选择**：文件变化（既有 watcher）→ `SpecViewerProvider.updateContent` → 重算 payload → `postMessage('state', payload)`。React 侧整体替换 state。

**理由**：粗粒度 + 小 payload 下，全量推送无性能问题，且 React 重渲染成本可控。speckit 的轻量 `viewerStateUpdated` 双路径是为避免大 markdown 重读，我们 `docs[].content` 已在读 payload 时一并获取，无独立 markdown watcher 必要。

## Risks / Trade-offs

- **[风险] 迁移期面板回归** → 改动 `SpecViewerProvider` 核心渲染路径，需手动验证 6 类树节点点击都能打开正确面板（依赖 `fix-spec-viewer-change-name-extraction` 已修复的 changeName 解析）。
- **[风险] webview 资源加载** → `dist/webview/app/index.html` 路径与 `localResourceRoots` 需对齐既有 4 页的加载方式，参考 `get-webview-content.ts`。
- **[取舍] 无内联编辑/进行态** → 首期面板是「只读 + 三个动作」，体验介于旧 HTML 与 speckit 之间；后续可立 `rich-spec-viewer-inline-edit` 等变更递进。
- **[取舍] 全量 state 推送** → 文档内容大时（长 design.md）每次刷新都重传，但粗粒度状态下刷新频率低（仅文件变化/动作触发），可接受。
- **[风险] React 面板与既有 HTML 面板的 `switchDoc` 命令名复用** → 保持同名降低迁移成本，但 provider 内部 handler 需从「重生成 HTML」改为「postMessage」。

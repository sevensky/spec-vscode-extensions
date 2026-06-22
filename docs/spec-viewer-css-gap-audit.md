# 富面板 CSS 差距盘点（spec-viewer vs speckit-companion）

> 本文档是富面板样式对齐 speckit-companion 的权威差距清单，由系统性盘点产出。
> 各 openspec 变更（base-style / inline-edit / md-enhance / activity-cards / toc）的 design 引用本文档对应分节。
> speckit 源码路径：`/www/wwwroot/vscode-extensions/speckit-companion/webview/styles/`

## 总览

| 归属变更 | 关注点数 | ✅ 齐全 | ⚠️ 残缺 | ❌ 缺失 |
|---|---|---|---|---|
| shared/base（→ base-style） | 19 | 3 | 5 | 11 |
| rich-spec-viewer-inline-edit | 17 | 1 | 7 | 9 |
| rich-spec-viewer-md-enhance | 24 | 2 | 5 | 17 |
| rich-spec-viewer-activity-cards | 28 | 0 | 0 | 28 |
| rich-spec-viewer-toc | 6 | 1 | 4 | 1 |
| **合计** | **94** | **7** | **21** | **66** |

---

## 一、shared/base（归属 `rich-spec-viewer-base-style`）

| # | 关注点 | speckit 源码 | 现状 | 说明 |
|---|--------|-------------|------|------|
| 1 | 完整 token 调色板 | `tokens.css:10-133` | ⚠️ 残缺 | 缺 text-sm/lg/xl/2xl/3xl、space-6/8、warning/error/purple/review、bg-primary/secondary/elevated/code/code-header、shadow-*、transition-*、radius-lg |
| 2 | 主题 fallback（亮/暗/高对比） | `tokens.css:139-201` | ❌ 缺失 | |
| 3 | reduced-motion 全局禁用 | `tokens.css:207-215` | ❌ 缺失 | |
| 4 | reset（*、body、字体平滑） | `_base.css:10-24` | ⚠️ 残缺 | 缺 box-sizing reset + antialiasing |
| 5 | 容器布局（viewer-container/content-area） | `_base.css:30-55` | ❌ 缺失 | |
| 6 | empty-state | `_base.css:61-71` | ❌ 缺失 | |
| 7 | 滚动条样式 | `_base.css:77-92` | ❌ 缺失 | |
| 8 | focus-visible 全局 outline | `_base.css:98-101` | ❌ 缺失 | |
| 9 | 高对比度调整 | `_base.css:107-125` | ❌ 缺失 | |
| 10 | 响应式 max-width:500px | `_base.css:131-158` | ❌ 缺失 | |
| 11 | 排版 h1-h6 | `_typography.css:11-45` | ✅ 齐全 | app.css:316-347 |
| 12 | 段落 + p+p 间距 | `_typography.css:51-59` | ⚠️ 残缺 | 缺 p+p margin-top |
| 13 | 列表（嵌套/pre+ol 间距） | `_typography.css:65-86` | ⚠️ 残缺 | 缺嵌套与 pre+ol 规则 |
| 14 | blockquote | `_typography.css:92-104` | ✅ 齐全 | app.css:362-370 |
| 15 | inline code | `_typography.css:110-115` | ✅ 齐全 | app.css:371-378 |
| 16 | card 原语 | `_primitives.css:13-46` | ❌ 缺失 | 决策：复用 shadcn Card |
| 17 | tooltip 占位 | `_primitives.css:81-85` | ❌ 缺失 | |
| 18 | 独立按钮系统 | `_buttons.css:7-119` | ❌ 缺失 | 决策：复用 shadcn Button |
| 19 | 动画 keyframe 库 | `_animations.css:10-115` | ❌ 缺失 | spin/fadeIn 等 10 个 |

## 二、rich-spec-viewer-inline-edit

| # | 关注点 | speckit 源码 | 现状 | 说明 |
|---|--------|-------------|------|------|
| 20 | .line 行包裹（hover/editing/empty/has-refinement） | `_line-actions.css:10-68` | ⚠️ 残缺 | 缺 .empty/.editing bg/.has-refinement/.line p margin reset |
| 21 | .line-add-btn（+ 按钮） | `_line-actions.css:74-122` | ⚠️ 残缺 | 我们用蓝色，speckit 用 success 绿；缺 :active/.empty 隐藏 |
| 22 | li.line 列表项变体 | `_line-actions.css:128-171` | ❌ 缺失 | |
| 23 | .line-comment-slot | `_line-actions.css:153-171` | ⚠️ 残缺 | 缺 inline-editor width:100% |
| 24 | legacy .line-actions/.inline-edit-input | `_line-actions.css:177-201` | ❌ 缺失 | |
| 25 | 状态隐藏（completed/archived 隐藏 +按钮） | `_line-actions.css:207-221` | ❌ 缺失 | |
| 26 | inline editor 卡片 | `_editor.css:11-94` | ⚠️ 残缺 | 类名不一致（inline-editor-textarea vs editor-textarea）；缺 header/context/footer |
| 27 | context action 按钮 | `_editor.css:97-144` | ❌ 缺失 | |
| 28 | editor 主按钮 | `_editor.css:147-176` | ❌ 缺失 | |
| 29 | inline comment 卡片 | `_refinements.css:10-57` | ⚠️ 残缺 | 类名不一致（comment-remove vs comment-delete）；缺 fadeIn |
| 30 | refine 提交按钮 | `_refinements.css:63-86` | ⚠️ 残缺 | 类名不一致（refine-btn vs refine-submit-btn） |
| 31 | section progress bar | `_tasks.css:10-41` | ❌ 缺失 | |
| 32 | task 列表容器 | `_tasks.css:48-53` | ⚠️ 残缺 | 用 .task-list，缺 :has() |
| 33 | task item（flex/checked/hover 负边距） | `_tasks.css:59-116` | ⚠️ 残缺 | 缺 .task-text flex/checked 色/hover 扩展 |
| 34 | 自定义 checkbox | `_tasks.css:122-161` | ✅ 齐全 | app.css:422-456 |
| 35 | task details 分组 | `_tasks.css:167-177` | ❌ 缺失 | |
| 36 | in-progress badge | `_tasks.css:183-193` | ❌ 缺失 | |

## 三、rich-spec-viewer-md-enhance

| # | 关注点 | speckit 源码 | 现状 | 说明 |
|---|--------|-------------|------|------|
| 37 | 内容容器（max-width 72ch） | `_content.css:10-20` | ❌ 缺失 | |
| 38 | spec metadata 条 | `_content.css:26-115` | ❌ 缺失 | |
| 39 | spec-input callout | `_content.css:117-131` | ❌ 缺失 | |
| 40 | 链接 hover | `_content.css:137-146` | ✅ 齐全 | app.css:379-383 |
| 41 | 水平线 | `_content.css:152-156` | ✅ 齐全 | app.css:384-388 |
| 42 | 图片 | `_content.css:162-168` | ❌ 缺失 | |
| 43 | strong/em | `_content.css:174-181` | ❌ 缺失 | |
| 44 | 状态隐藏（DRAFT/spec-meta） | `_content.css:187-202` | ❌ 缺失 | |
| 45 | structured header | `_content.css:208-278` | ❌ 缺失 | |
| 46 | spec badge 系统 | `_content.css:284-355` | ❌ 缺失 | |
| 47 | code-block 容器 | `_code.css:11-50` | ⚠️ 残缺 | 缺 language-label ::before/radius-lg |
| 48 | tree-structure 块 | `_code.css:53-72` | ❌ 缺失 | |
| 49 | legacy pre 兜底 | `_code.css:75-93` | ❌ 缺失 | |
| 50 | file-ref pill | `_code.css:100-143` | ❌ 缺失 | |
| 51 | hljs 背景重置 | `_code.css:150-157` | ⚠️ 残缺 | 缺 .hljs bg transparent 重置 |
| 52 | mermaid 容器 | `_code.css:163-188` | ⚠️ 残缺 | 类名 wrapper vs container；缺 min-width |
| 53 | mermaid 控件工具栏 | `_code.css:191-213` | ❌ 缺失 | |
| 54 | mermaid 主题覆盖 | `_code.css:216-275` | ❌ 缺失 | |
| 55 | 标准表格 | `_tables.css:10-56` | ❌ 缺失 | 仅 scenario-table |
| 56 | user-story 卡片 | `_tables.css:62-164` | ❌ 缺失 | |
| 57 | scenario 表格 | `_tables.css:170-377` | ⚠️ 残缺 | 缺彩色列头/行号/row-add/refinement 行态 |
| 58 | acceptance scenarios 列表 | `_tables.css:383-420` | ❌ 缺失 | |
| 59 | callout 块 | `_callouts.css:10-97` | ❌ 缺失 | |
| 60 | template-instructions details | `_callouts.css:103-125` | ❌ 缺失 | |

## 四、rich-spec-viewer-activity-cards

| # | 关注点 | speckit 源码 | 现状 | 说明 |
|---|--------|-------------|------|------|
| 61 | compact nav | `_navigation.css:10-22` | ❌ 缺失 | |
| 62 | step-tabs（hover/current/in-flight/locked） | `_navigation.css:28-159` | ❌ 缺失 | |
| 63 | step-tab 百分比 | `_navigation.css:169-186` | ❌ 缺失 | |
| 64 | step-tab 计时 | `_navigation.css:197-203` | ❌ 缺失 | |
| 65 | stale tab 标记 | `_navigation.css:206-208` | ❌ 缺失 | |
| 66 | step 连接线 | `_navigation.css:211-221` | ❌ 缺失 | |
| 67 | step children 轨道 | `_navigation.css:234-295` | ❌ 缺失 | |
| 68 | footer 动作栏 | `_footer.css:10-129` | ❌ 缺失 | |
| 69 | action toast | `_footer.css:135-156` | ❌ 缺失 | |
| 70 | undo toast | `_footer.css:162-210` | ❌ 缺失 | |
| 71 | 状态隐藏 footer 按钮 | `_footer.css:239-243` | ❌ 缺失 | |
| 72 | activity 容器 + empty | `_activity.css:11-28` | ❌ 缺失 | |
| 73 | activity card chrome | `_activity.css:34-67` | ❌ 缺失 | |
| 74 | approach card | `_activity.css:73-98` | ❌ 缺失 | |
| 75 | status pill | `_activity.css:100-132` | ❌ 缺失 | |
| 76 | checkpoint/pr-link | `_activity.css:134-153` | ❌ 缺失 | |
| 77 | phases card（时间线） | `_activity.css:159-319` | ❌ 缺失 | 大块 |
| 78 | actor badge | `_activity.css:325-368` | ❌ 缺失 | |
| 79 | tasks card | `_activity.css:374-457` | ❌ 缺失 | |
| 80 | decisions/concerns 列表 | `_activity.css:462-491` | ❌ 缺失 | |
| 81 | files card | `_activity.css:497-523` | ❌ 缺失 | |
| 82 | activity toggle 按钮 | `_activity.css:529-556` | ❌ 缺失 | |
| 83 | comments card | `_activity.css:559-641` | ❌ 缺失 | |
| 84 | stale banner | `_staleness.css:10-41` | ❌ 缺失 | |
| 85 | stale badge | `_staleness.css:47-62` | ❌ 缺失 | |
| 86 | refine modal | `_modal.css:10-126` | ❌ 缺失 | |
| 87 | loading overlay | `_modal.css:132-152` | ❌ 缺失 | |
| 88 | install banner | `_install-banner.css:7-85` | ❌ 缺失 | |

## 五、rich-spec-viewer-toc

| # | 关注点 | speckit 源码 | 现状 | 说明 |
|---|--------|-------------|------|------|
| 89 | TOC 布局 token | `_toc.css:7-10` | ❌ 缺失 | |
| 90 | aside.spec-toc（sticky/flex/order） | `_toc.css:12-23` | ⚠️ 残缺 | 用 #spec-toc，缺 sticky/positioning |
| 91 | spec-toc header/label/toggle | `_toc.css:25-72` | ⚠️ 残缺 | 类名不一致；缺 aria-pressed 态 |
| 92 | spec-toc empty + narrow hide | `_toc.css:74-81` | ⚠️ 残缺 | 缺窄屏隐藏 |
| 93 | spec-toc list | `_toc.css:83-96` | ✅ 齐全 | |
| 94 | spec-toc link（border-left/aria-current/focus） | `_toc.css:98-129` | ⚠️ 残缺 | aria-current 值不同；缺 border-left/focus |

---

## 跨切风险

1. **token 地基必须先行**：base-style 的 11 项缺失（尤其动画库、完整 token）阻塞 3/4 功能变更。
2. **类名分叉**：TOC（#spec-toc vs aside.spec-toc）、inline editor（.inline-editor-textarea vs .editor-textarea）、comment（.comment-remove vs .comment-delete）、refine（.refine-btn vs .refine-submit-btn）。各变更 apply 时同步对齐 speckit 类名。
3. **activity-cards 基本全绿**：28 项全缺，_activity.css 单文件 642 行，是最大工作项。
4. **app.css 有重复声明**：.spec-md ul.task-list 与 li.task-item 各声明两次（app.css:391-395 & 512-515），cleanup 归 inline-edit。

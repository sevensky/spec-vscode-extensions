/** webview 简体中文字典 */
export const zhCn: Record<string, string> = {
	// ── common ──
	"common.cancel": "取消",
	"common.send": "发送",
	"common.clear": "清空",
	"common.creating": "创建中…",

	// ── simple view ──
	"simple.title": "简单视图",
	"simple.description": "这是一个简单的 WebView 视图。",

	// ── interactive view ──
	"interactive.title": "交互式试验场",
	"interactive.description": "为扩展编写请求，并在下方查看响应。",
	"interactive.placeholder": "向扩展发送消息...",
	"interactive.sendHint": "按 ⌘⏎ / Ctrl+Enter 发送",
	"interactive.latestResponse": "最新响应",
	"interactive.clearResponse": "清除响应",
	"interactive.emptyResponse": "扩展的响应将在此处显示。",

	// ── create-spec ──
	"createSpec.title": "新建 Spec",
	"createSpec.subtitle": "为新规范提供上下文。产品上下文为必填项；其他部分可选但建议填写。",
	"createSpec.productContext": "产品上下文",
	"createSpec.productContextPlaceholder": "描述目标、背景以及你想要实现的…",
	"createSpec.productContextRequired": "产品上下文为必填项。",
	"createSpec.keyScenarios": "关键场景",
	"createSpec.keyScenariosPlaceholder": "例如：当用户点击保存时，出现通知...",
	"createSpec.technicalConstraints": "技术约束",
	"createSpec.technicalConstraintsPlaceholder": "需要考虑的库、模式或现有系统…",
	"createSpec.relatedFiles": "相关文件",
	"createSpec.relatedFilesPlaceholder": "src/utils/auth.ts, src/components/Login.tsx...",
	"createSpec.openQuestions": "待定问题",
	"createSpec.openQuestionsPlaceholder": "任何不确定或风险？",
	"createSpec.submitFailed": "提交失败。",
	"createSpec.changesAvailable": "仍有可用更改。关闭操作已取消。",
	"createSpec.sending": "正在发送 spec 提示词…",
	"createSpec.draftSaved": "草稿保存于 {time}",
	"createSpec.unsavedChanges": "有未保存的更改",
	"createSpec.allSaved": "所有更改已保存",
	"createSpec.createButton": "创建 Spec",

	// ── create-steering ──
	"createSteering.title": "创建自定义 Steering",
	"createSteering.subtitle": "分享你希望每个 agent 遵循的护栏和项目特定规则。摘要为必填项；其他部分可选。",
	"createSteering.guidanceSummary": "指导摘要",
	"createSteering.guidanceSummaryPlaceholder": "描述你希望 agent 遵循的核心指导…",
	"createSteering.guidanceSummaryRequired": "指导摘要为必填项。",
	"createSteering.audience": "受众与归属",
	"createSteering.audiencePlaceholder": "谁应遵循此指导？包括角色、团队或仓库…",
	"createSteering.keyPractices": "需遵循的关键实践",
	"createSteering.keyPracticesPlaceholder": "列出 agent 必须遵循的行为、模式或示例…",
	"createSteering.pitfalls": "需避免的陷阱",
	"createSteering.pitfallsPlaceholder": "记录反模式、陷阱或 agent 绝不能做的事…",
	"createSteering.submitFailed": "提交 steering 提示词失败。",
	"createSteering.createButton": "创建 Steering",

	// ── unknown page ──
	"unknownPage": "未知页面：{page}",
};

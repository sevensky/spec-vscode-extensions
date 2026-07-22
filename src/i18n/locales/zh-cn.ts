/**
 * 简体中文字典。
 * Key 与 en.ts 一一对应。
 */
export const zhCn: Record<string, string> = {
	// ── common ──
	"common.noWorkspace": "未找到工作区文件夹",
	"common.noWorkspaceOpen": "未打开工作区文件夹",
	"common.cancel": "取消",
	"common.save": "保存",
	"common.delete": "删除",
	"common.overwrite": "覆盖",
	"common.discard": "放弃",
	"common.ok": "确定",
	"common.learnMore": "了解更多",

	// ── error（通用失败提示）──
	"error.failed": "失败：{msg}",
	"error.createPromptFailed": "创建提示词失败：{msg}",
	"error.runPromptFailed": "运行提示词失败：{msg}",
	"error.deletePromptFailed": "删除提示词失败：{msg}",
	"error.renameFileFailed": "重命名文件失败：{msg}",
	"error.createSpecPromptFailed": "创建 Spec 提示词失败：{msg}",
	"error.openMcpConfigFailed": "打开 MCP 配置失败：{msg}",
	"error.initPromptSystemFailed": "初始化提示词系统失败：{error}",
	"error.runCopilotFailed": "运行 Copilot 失败：{error}",
	"error.updateSpecsFromDesignFailed": "从详细设计更新 specs 失败：{msg}",
	"error.openCreateSpecDialogFailed": "打开创建 Spec 对话框失败：{msg}",
	"error.deleteSpecFailed": "删除 spec 失败：{error}",
	"error.readArchivePromptFailed": "读取归档提示词失败：{msg}",
	"error.readReviewPromptFailed": "执行审查失败：{msg}",

	// ── error（确定性提示）──
	"error.noPromptSelected": "未选择提示词文件",
	"error.determineItemName": "无法确定条目名称。",
	"error.determineChangeId": "无法确定变更 ID。",
	"error.parentDirTraversal": "不允许访问上级目录。",
	"error.missingPromptTemplate": "缺少打包的提示词模板：{path}（{detail}）",
	"error.unreadableFile": "缺少或不可读的 {label}：{path}（{detail}）",
	"error.readPromptFile": "读取提示词文件失败。",
	"error.unableOpenCreateSpec": "无法打开创建 Spec 对话框",

	// ── error（条件性 create/run prompt）──
	"error.createPromptGeneric": "创建提示词失败。",
	"error.runPromptGeneric": "运行提示词失败。",

	// ── prompt（+号创建/运行提示词）──
	"prompt.create.title": "创建提示词",
	"prompt.create.placeHolder": "提示词名称（kebab-case）",
	"prompt.create.promptLabel": "将在 {path} 下创建 Markdown 文件",
	"prompt.create.nameRequired": "名称为必填项",
	"prompt.create.confirmDelete": "确定要删除 '{name}' 吗？",
	"prompt.deleteSuccess": 'Spec "{name}" 已成功删除',
	"prompt.selectRename": "选择要重命名的文件。",
	"prompt.selectRun": "选择要运行的提示词。",
	"prompt.inputFileName": "输入提示词文件名",
	"prompt.fileNamePlaceholder": "sample-prompt.md",
	"prompt.inputNewFileName": "输入新文件名",
	"prompt.fileNameRequired": "文件名为必填项",
	"prompt.nameRequired": "名称为必填项",
	"prompt.invalidChars": "文件名包含非法字符",
	"prompt.relativeSegments": "不允许相对路径段",
	"prompt.openWorkspaceToCreate": "打开一个工作区以创建提示词",
	"prompt.deprecationWarning":
		"提示词文件 '{legacy}' 已重命名为 '{current}'，请更新引用。",
	"prompt.migrationError":
		'未找到 OpenSpec v1 提示词文件（当前 agent：{agent}）。\n\n需要：{requiredPath}\n\n可能原因与解决办法：\n\n1. 尚未初始化 OpenSpec v1：\n   npm install -g openspec@latest\n   cd {workspace}\n   openspec init\n\n2. 全局配置 delivery 设为 "skills" 导致命令文件未生成：\n   检查 ~/.config/openspec/config.json，将 "delivery" 改为 "both" 后重新运行：\n   openspec init --force\n\n3. 工作流配置未包含所需工作流：\n   确认 config.json 的 workflows 包含 "propose"（生成 propose 命令文件）。\n\n更多信息请参见工作区中的 README.md。',
	"prompt.legacyDeprecation":
		"⚠️ 正在使用旧版 OpenSpec v0.x 提示词文件：{legacy}\n\n请通过在工作区运行 'openspec init' 迁移到 OpenSpec v1。\n这将创建新的提示词文件：{current}\n\n旧版支持将在未来版本中移除。",
	"prompt.templatePlaceholder":
		"在此描述你的提示词。执行时此文件内容将发送给 Copilot。",

	// ── spec（Spec 管理）──
	"spec.unsavedInput": "您有未保存的 Spec 输入。关闭对话框并放弃更改吗？",
	"spec.unsavedInputDetail": "选择取消可继续编辑并保留当前输入。",

	// ── steering（Steering 管理）──
	"steering.globalExists":
		"全局配置文件（~/.github/copilot-instructions.md）已存在。是否覆盖？",
	"steering.agentsExists":
		"项目 AGENTS.md（openspec/AGENTS.md）已存在。是否覆盖？",
	"steering.saveGuard": "确定要保存对此 agent 文件的更改吗？",

	// ── mcp / settings ──
	"mcp.configNotFound": "在 {path} 未找到 MCP 配置。",
	"view.visibilityUpdated": "视图可见性已更新！",
	"view.selectViewsPlaceholder": "选择要显示的视图",
	"task.executeFailed": "执行任务失败：{msg}",

	// ── claude service ──
	"claude.notInstalled":
		'Claude Code CLI（"claude"）未安装或不在 PATH 中。请安装 Claude Code 后重试，或在设置中将 aiAgent 切换回 github-copilot / codex。',

	// ── TreeView: spec-explorer ──
	"treeview.changes": "变更",
	"treeview.currentSpecs": "当前 Specs",
	"treeview.spec": "Spec",
	"treeview.openSpec": "打开 Spec",
	"treeview.proposal": "提案",
	"treeview.openProposal": "打开提案",
	"treeview.tasks": "任务",
	"treeview.openTasks": "打开任务",
	"treeview.design": "设计",
	"treeview.openDesign": "打开设计",
	"treeview.detailedDesign": "详细设计",
	"treeview.openDetailedDesign": "打开详细设计",
	"treeview.specs": "Specs",

	// ── TreeView: prompts-explorer ──
	"treeview.global": "全局",
	"treeview.projectPrompts": "项目提示词",
	"treeview.projectInstructions": "项目指令",
	"treeview.projectAgents": "项目 Agents",
	"treeview.openWorkspaceToManagePrompts": "打开工作区以管理提示词",
	"treeview.openWorkspaceToManageInstructions": "打开工作区以管理指令",
	"treeview.openWorkspaceToManageAgents": "打开工作区以管理 Agents",
	"treeview.globalPromptsDirNotFound": "未找到全局提示词目录",
	"treeview.noPromptsFound": "未找到提示词",
	"treeview.addPromptsUnder": "在 {label} 下添加提示词",
	"treeview.openPrompt": "打开提示词",
	"treeview.loadingPrompts": "加载提示词中...",
	"treeview.createPromptsHint": "在配置的提示词目录下创建提示词",
	"treeview.locatedAt": "{label} 位于 {path}",

	// ── TreeView: steering-explorer ──
	"treeview.agents": "AGENTS",
	"treeview.createProjectInstructions": "创建项目指令",
	"treeview.projectSpec": "项目 Spec",
	"treeview.copilotInstructions": "Copilot 指令",
	"treeview.openCopilotInstructions": "打开 Copilot 指令",
	"treeview.agentInstructions": "Agent 指令",
	"treeview.openAgentInstructions": "打开 Agent 指令",
	"treeview.rootInstructions": "根指令",
	"treeview.openRootInstructions": "打开根指令",
	"treeview.projectDefinition": "项目定义",
	"treeview.openProjectDefinition": "打开项目定义",
	"treeview.clickToCreate": "点击创建项目指令",

	// ── TreeView: tasks 进度 tooltip ──
	"treeview.noTasksFile": "未找到 tasks.md",
	"treeview.noRecognizedTasks": "tasks.md 不包含可识别的任务",
	"treeview.allTasksComplete": "所有任务已完成",
	"treeview.tasksProgress": "{checked}/{total} 个任务已完成（{percent}%）",
};

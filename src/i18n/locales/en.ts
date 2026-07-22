/**
 * 英文字典（默认 locale）。
 * Key 命名：domain.detail（common/error/prompt/spec/steering/upload/webview）。
 * 含弹窗 + TreeView 文案（不含 webview，webview 有独立字典）。
 */
export const en: Record<string, string> = {
	// ── common ──
	"common.noWorkspace": "No workspace folder found",
	"common.noWorkspaceOpen": "No workspace folder open",
	"common.cancel": "Cancel",
	"common.save": "Save",
	"common.delete": "Delete",
	"common.overwrite": "Overwrite",
	"common.discard": "Discard",
	"common.ok": "OK",
	"common.learnMore": "Learn More",

	// ── error（通用失败提示）──
	"error.failed": "Failed: {msg}",
	"error.createPromptFailed": "Failed to create prompt: {msg}",
	"error.runPromptFailed": "Failed to run prompt: {msg}",
	"error.deletePromptFailed": "Failed to delete prompt: {msg}",
	"error.renameFileFailed": "Failed to rename file: {msg}",
	"error.createSpecPromptFailed": "Failed to create spec prompt: {msg}",
	"error.openMcpConfigFailed": "Failed to open MCP config: {msg}",
	"error.initPromptSystemFailed": "Failed to initialize prompt system: {error}",
	"error.runCopilotFailed": "Failed to run Copilot: {error}",
	"error.updateSpecsFromDesignFailed":
		"Failed to update specs from detailed design: {msg}",
	"error.openCreateSpecDialogFailed":
		"Failed to open Create Spec dialog: {msg}",
	"error.deleteSpecFailed": "Failed to delete spec: {error}",
	"error.readArchivePromptFailed": "Failed to read archive prompt: {msg}",
	"error.readReviewPromptFailed": "Failed to run review: {msg}",

	// ── error（确定性提示）──
	"error.noPromptSelected": "No prompt file selected",
	"error.determineItemName": "Could not determine item name.",
	"error.determineChangeId": "Could not determine change ID.",
	"error.parentDirTraversal": "Parent directory traversal is not allowed.",
	"error.missingPromptTemplate":
		"Missing packaged prompt template: {path} ({detail})",
	"error.unreadableFile": "Missing or unreadable {label}: {path} ({detail})",
	"error.readPromptFile": "Failed to read prompt file.",
	"error.unableOpenCreateSpec": "Unable to open Create Spec dialog",

	// ── error（条件性 create/run prompt）──
	"error.createPromptGeneric": "Failed to create prompt.",
	"error.runPromptGeneric": "Failed to run prompt.",

	// ── prompt（+号创建/运行提示词）──
	"prompt.create.title": "Create Prompt",
	"prompt.create.placeHolder": "prompt name (kebab-case)",
	"prompt.create.promptLabel": "A markdown file will be created under {path}",
	"prompt.create.nameRequired": "Name is required",
	"prompt.create.confirmDelete": "Are you sure you want to delete '{name}'?",
	"prompt.deleteSuccess": 'Spec "{name}" deleted successfully',
	"prompt.selectRename": "Select a file to rename.",
	"prompt.selectRun": "Select a prompt to run.",
	"prompt.inputFileName": "Enter prompt file name",
	"prompt.fileNamePlaceholder": "sample-prompt.md",
	"prompt.inputNewFileName": "Enter new file name",
	"prompt.fileNameRequired": "File name is required",
	"prompt.nameRequired": "Name is required",
	"prompt.invalidChars": "Invalid characters in file name",
	"prompt.relativeSegments": "Relative segments are not allowed",
	"prompt.openWorkspaceToCreate": "Open a workspace to create prompts.",
	"prompt.deprecationWarning":
		"The prompt file '{legacy}' has been renamed to '{current}'. Please update your references.",
	"prompt.migrationError":
		'OpenSpec v1 prompt files not found (current agent: {agent}).\n\nRequired: {requiredPath}\n\nPossible causes and fixes:\n\n1. OpenSpec v1 not initialized yet:\n   npm install -g openspec@latest\n   cd {workspace}\n   openspec init\n\n2. Global config delivery set to "skills" (command files skipped):\n   Check ~/.config/openspec/config.json, change "delivery" to "both", then re-run:\n   openspec init --force\n\n3. Required workflow not in profile:\n   Ensure config.json workflows include "propose" (generates propose command file).\n\nFor more information, see README.md in your workspace.',
	"prompt.legacyDeprecation":
		"⚠️ Using legacy OpenSpec v0.x prompt file: {legacy}\n\nPlease migrate to OpenSpec v1 by running 'openspec init' in your workspace.\nThis will create the new prompt file: {current}\n\nLegacy support will be removed in a future release.",
	"prompt.templatePlaceholder":
		"Describe your prompt here. This file will be sent to Copilot when executed.",

	// ── spec（Spec 管理）──
	"spec.unsavedInput":
		"You have unsaved spec input. Close the dialog and discard your changes?",
	"spec.unsavedInputDetail":
		"Choose Cancel to resume editing and keep your current input.",

	// ── steering（Steering 管理）──
	"steering.globalExists":
		"Global configuration file (~/.github/copilot-instructions.md) already exists. Overwrite?",
	"steering.agentsExists":
		"Project AGENTS.md (openspec/AGENTS.md) already exists. Overwrite?",
	"steering.saveGuard":
		"Are you sure you want to save changes to this agent file?",

	// ── mcp / settings ──
	"mcp.configNotFound": "MCP config not found at {path}.",
	"view.visibilityUpdated": "View visibility updated!",
	"view.selectViewsPlaceholder": "Select views to show",
	"task.executeFailed": "Failed to execute task: {msg}",

	// ── claude service ──
	"claude.notInstalled":
		'Claude Code CLI ("claude") is not installed or not in PATH. Please install Claude Code and retry, or switch aiAgent back to github-copilot / codex in settings.',

	// ── TreeView: spec-explorer ──
	"treeview.changes": "Changes",
	"treeview.currentSpecs": "Current Specs",
	"treeview.spec": "Spec",
	"treeview.openSpec": "Open Spec",
	"treeview.proposal": "Proposal",
	"treeview.openProposal": "Open Proposal",
	"treeview.tasks": "Tasks",
	"treeview.openTasks": "Open Tasks",
	"treeview.design": "Design",
	"treeview.openDesign": "Open Design",
	"treeview.detailedDesign": "Detailed Design",
	"treeview.openDetailedDesign": "Open Detailed Design",
	"treeview.specs": "Specs",

	// ── TreeView: prompts-explorer ──
	"treeview.global": "Global",
	"treeview.projectPrompts": "Project Prompts",
	"treeview.projectInstructions": "Project Instructions",
	"treeview.projectAgents": "Project Agents",
	"treeview.openWorkspaceToManagePrompts": "Open a workspace to manage prompts",
	"treeview.openWorkspaceToManageInstructions":
		"Open a workspace to manage instructions",
	"treeview.openWorkspaceToManageAgents": "Open a workspace to manage agents",
	"treeview.globalPromptsDirNotFound": "Global prompts directory not found",
	"treeview.noPromptsFound": "No prompts found",
	"treeview.addPromptsUnder": "Add prompts under {label}",
	"treeview.openPrompt": "Open Prompt",
	"treeview.loadingPrompts": "Loading prompts...",
	"treeview.createPromptsHint":
		"Create prompts under the configured prompts directory",
	"treeview.locatedAt": "{label} located at {path}",

	// ── TreeView: steering-explorer ──
	"treeview.agents": "AGENTS",
	"treeview.createProjectInstructions": "Create Project Instructions",
	"treeview.projectSpec": "Project Spec",
	"treeview.copilotInstructions": "Copilot Instructions",
	"treeview.openCopilotInstructions": "Open Copilot Instructions",
	"treeview.agentInstructions": "Agent Instructions",
	"treeview.openAgentInstructions": "Open Agent Instructions",
	"treeview.rootInstructions": "Root Instructions",
	"treeview.openRootInstructions": "Open Root Instructions",
	"treeview.projectDefinition": "Project Definition",
	"treeview.openProjectDefinition": "Open Project Definition",
	"treeview.clickToCreate": "Click to create Project Instructions",

	// ── TreeView: tasks 进度 tooltip ──
	"treeview.noTasksFile": "No tasks.md found",
	"treeview.noRecognizedTasks": "tasks.md contains no recognized tasks",
	"treeview.allTasksComplete": "All tasks complete",
	"treeview.tasksProgress": "{checked} of {total} tasks complete ({percent}%)",
};

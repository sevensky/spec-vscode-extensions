import { basename, dirname, join } from "path";
import { homedir } from "os";
import { t } from "../i18n";
import {
	type Command,
	commands,
	type Event,
	EventEmitter,
	type ExtensionContext,
	FileType,
	ThemeIcon,
	type TreeDataProvider,
	TreeItem,
	TreeItemCollapsibleState,
	Uri,
	window,
	workspace,
} from "vscode";
import { addDocumentToCopilotChat } from "../utils/copilot-chat-utils";
import { ConfigManager } from "../utils/config-manager";
import { getVSCodeUserDataPath, isWindowsOrWsl } from "../utils/platform-utils";

const { joinPath } = Uri;

type PromptSource =
	| "project-prompts"
	| "project-instructions"
	| "project-agents"
	| "global";

const invalidFileNamePattern = /[\\/:*?"<>|]/;

type TreeEventPayload = PromptItem | undefined | null | void;

export class PromptsExplorerProvider implements TreeDataProvider<PromptItem> {
	static readonly viewId = "openspec-for-agent.views.promptsExplorer";
	static readonly createPromptCommandId = "openspec-for-agent.prompts.create";
	static readonly refreshCommandId = "openspec-for-agent.prompts.refresh";
	static readonly runPromptCommandId = "openspec-for-agent.prompts.run";

	private readonly changeEmitter = new EventEmitter<TreeEventPayload>();
	readonly onDidChangeTreeData: Event<TreeEventPayload> =
		this.changeEmitter.event;

	private isLoading = false;

	private readonly context: ExtensionContext;
	private readonly configManager: ConfigManager;

	constructor(context: ExtensionContext) {
		this.context = context;
		this.configManager = ConfigManager.getInstance();
	}

	refresh = (): void => {
		this.isLoading = true;
		this.changeEmitter.fire();
		setTimeout(() => {
			this.isLoading = false;
			this.changeEmitter.fire();
		}, 120);
	};

	createPrompt = async (item?: PromptItem): Promise<void> => {
		let rootUri: Uri | undefined;

		if (item?.source === "global") {
			rootUri = await this.getGlobalPromptsRoot();
		} else if (item?.source === "project-instructions") {
			rootUri = this.getInstructionsRoot();
		} else if (item?.source === "project-agents") {
			rootUri = this.getAgentsRoot();
		} else {
			rootUri = this.getPromptsRoot();
		}

		if (!rootUri) {
			await window.showWarningMessage(t("prompt.openWorkspaceToCreate"));
			return;
		}

		const fileName = await window.showInputBox({
			prompt: t("prompt.inputFileName"),
			placeHolder: t("prompt.fileNamePlaceholder"),
			validateInput: (value) => {
				const trimmed = value.trim();
				if (!trimmed) {
					return t("prompt.fileNameRequired");
				}
				// biome-ignore lint/performance/useTopLevelRegex: ignore
				if (/[\\:*?"<>|]/.test(trimmed)) {
					return t("prompt.invalidChars");
				}
				return;
			},
		});

		const trimmedName = fileName?.trim();
		if (!trimmedName) {
			return;
		}

		const normalizedName = this.normalizePromptFileName(
			trimmedName,
			item?.source === "global"
		);

		// biome-ignore lint/performance/useTopLevelRegex: ignore
		const parts = normalizedName.split(/[\\/]+/).filter(Boolean);
		if (parts.some((segment) => segment === "..")) {
			await window.showErrorMessage(
				t("error.parentDirTraversal")
			);
			return;
		}

		const parentDir =
			parts.length > 1 ? joinPath(rootUri, ...parts.slice(0, -1)) : rootUri;
		const fileUri = joinPath(rootUri, ...parts);

		try {
			await workspace.fs.createDirectory(parentDir);
			const exists = await this.pathExists(fileUri);
			if (!exists) {
				await workspace.fs.writeFile(fileUri, new Uint8Array());
			}
			await commands.executeCommand("vscode.open", fileUri);
		} catch (error) {
			await window.showErrorMessage(
				error instanceof Error
					? t("error.createPromptFailed", { msg: error.message })
					: t("error.createPromptGeneric")
			);
			return;
		}

		this.refresh();
	};

	renamePrompt = async (item?: PromptItem): Promise<void> => {
		if (!item?.resourceUri) {
			await window.showInformationMessage(t("prompt.selectRename"));
			return;
		}

		const sourceUri = item.resourceUri;
		const currentName = basename(sourceUri.fsPath);
		const newName = await window.showInputBox({
			prompt: t("prompt.inputNewFileName"),
			value: currentName,
			validateInput: (value) => {
				const trimmed = value.trim();
				if (!trimmed) {
					return t("prompt.fileNameRequired");
				}
				if (invalidFileNamePattern.test(trimmed)) {
					return t("prompt.invalidChars");
				}
				if (trimmed === "." || trimmed === ".." || trimmed.includes("..")) {
					return t("prompt.relativeSegments");
				}
				return;
			},
		});

		const trimmedName = newName?.trim();
		if (!trimmedName || trimmedName === currentName) {
			return;
		}

		const targetPath = join(dirname(sourceUri.fsPath), trimmedName);
		const targetUri = Uri.file(targetPath);

		try {
			await workspace.fs.rename(sourceUri, targetUri, { overwrite: false });
		} catch (error) {
			const message =
				error instanceof Error ? error.message : t("error.renameFileFailed", { msg: "" });
			await window.showErrorMessage(t("error.renameFileFailed", { msg: message }));
			return;
		}

		this.refresh();
	};

	runPrompt = async (item?: PromptItem): Promise<void> => {
		if (!item?.resourceUri) {
			await window.showInformationMessage(t("prompt.selectRun"));
			return;
		}

		try {
			await addDocumentToCopilotChat(item.resourceUri);
		} catch (error) {
			const message =
				error instanceof Error
					? t("error.runPromptFailed", { msg: error.message })
					: t("error.runPromptGeneric");
			await window.showErrorMessage(message);
		}
	};

	getTreeItem = (element: PromptItem): TreeItem => element;

	getChildren = (element?: PromptItem): Promise<PromptItem[]> => {
		if (!element) {
			return this.getRootItems();
		}

		if (element.contextValue === "prompt-group-project") {
			return this.getPromptGroupChildren("project-prompts");
		}

		if (element.contextValue === "prompt-group-project-instructions") {
			return this.getPromptGroupChildren("project-instructions");
		}

		if (element.contextValue === "prompt-group-project-agents") {
			return this.getPromptGroupChildren("project-agents");
		}

		if (element.contextValue === "prompt-group-global") {
			return this.getPromptGroupChildren("global");
		}

		return Promise.resolve([]);
	};

	private readonly getRootItems = async (): Promise<PromptItem[]> => {
		const projectDescription = this.configManager.getPath("prompts");
		const instructionsDescription = ".github/instructions";
		const agentsDescription = ".github/agents";
		const globalDescription = await this.getGlobalPromptsLabel();

		return [
			new PromptItem(
				t("treeview.global"),
				TreeItemCollapsibleState.Collapsed,
				"prompt-group-global",
				{
					description: globalDescription,
					tooltip: t("treeview.locatedAt", { label: t("treeview.global"), path: globalDescription }),
					source: "global",
				}
			),
			new PromptItem(
				t("treeview.projectPrompts"),
				TreeItemCollapsibleState.Collapsed,
				"prompt-group-project",
				{
					description: projectDescription,
					tooltip: t("treeview.locatedAt", { label: t("treeview.projectPrompts"), path: projectDescription }),
					source: "project-prompts",
				}
			),
			new PromptItem(
				t("treeview.projectInstructions"),
				TreeItemCollapsibleState.Collapsed,
				"prompt-group-project-instructions",
				{
					description: instructionsDescription,
					tooltip: t("treeview.locatedAt", { label: t("treeview.projectInstructions"), path: instructionsDescription }),
					source: "project-instructions",
				}
			),
			new PromptItem(
				t("treeview.projectAgents"),
				TreeItemCollapsibleState.Collapsed,
				"prompt-group-project-agents",
				{
					description: agentsDescription,
					tooltip: t("treeview.locatedAt", { label: t("treeview.projectAgents"), path: agentsDescription }),
					source: "project-agents",
				}
			),
		];
	};

	private readonly getPromptGroupChildren = (
		source: PromptSource
	): Promise<PromptItem[]> => {
		if (this.isLoading) {
			return Promise.resolve([this.createLoadingItem()]);
		}

		if (source === "project-prompts") {
			return this.getProjectPromptItems();
		}

		if (source === "project-instructions") {
			return this.getProjectInstructionItems();
		}

		if (source === "project-agents") {
			return this.getProjectAgentItems();
		}

		return this.getGlobalPromptItems();
	};

	private readonly getProjectPromptItems = (): Promise<PromptItem[]> => {
		const rootUri = this.getPromptsRoot();
		if (!rootUri) {
			return Promise.resolve([
				new PromptItem(
					t("treeview.openWorkspaceToManagePrompts"),
					TreeItemCollapsibleState.None,
					"prompts-empty"
				),
			]);
		}

		return this.createPromptItems(rootUri, "project-prompts");
	};

	private readonly getProjectInstructionItems = (): Promise<PromptItem[]> => {
		const rootUri = this.getInstructionsRoot();
		if (!rootUri) {
			return Promise.resolve([
				new PromptItem(
					t("treeview.openWorkspaceToManageInstructions"),
					TreeItemCollapsibleState.None,
					"prompts-empty"
				),
			]);
		}

		return this.createPromptItems(rootUri, "project-instructions");
	};

	private readonly getProjectAgentItems = (): Promise<PromptItem[]> => {
		const rootUri = this.getAgentsRoot();
		if (!rootUri) {
			return Promise.resolve([
				new PromptItem(
					t("treeview.openWorkspaceToManageAgents"),
					TreeItemCollapsibleState.None,
					"prompts-empty"
				),
			]);
		}

		return this.createPromptItems(rootUri, "project-agents");
	};

	private readonly getGlobalPromptItems = async (): Promise<PromptItem[]> => {
		const rootUri = await this.getGlobalPromptsRoot();
		if (!rootUri) {
			return [
				new PromptItem(
					t("treeview.globalPromptsDirNotFound"),
					TreeItemCollapsibleState.None,
					"prompts-empty"
				),
			];
		}

		return this.createPromptItems(rootUri, "global");
	};

	private readonly createPromptItems = async (
		rootUri: Uri,
		source: PromptSource
	): Promise<PromptItem[]> => {
		const suffix = source === "global" ? "" : ".md";
		const promptFiles = await this.readMarkdownFiles(rootUri, suffix);

		if (promptFiles.length === 0) {
			let label: string;
			if (source === "project-prompts") {
				label = this.configManager.getPath("prompts");
			} else if (source === "project-instructions") {
				label = ".github/instructions";
			} else if (source === "project-agents") {
				label = ".github/agents";
			} else {
				label = await this.getGlobalPromptsLabel();
			}
			return [
				new PromptItem(
					t("treeview.noPromptsFound"),
					TreeItemCollapsibleState.None,
					"prompts-empty",
					{
						tooltip: t("treeview.addPromptsUnder", { label: label }),
					}
				),
			];
		}

		return promptFiles
			.sort((a, b) => a.localeCompare(b))
			.map((pathString) => {
				const uri = Uri.file(pathString);
				const command: Command = {
					command: "vscode.open",
					title: t("treeview.openPrompt"),
					arguments: [uri],
				};
				const isRunnable = pathString.endsWith(".prompt.md");
				const contextValue = isRunnable ? "prompt-runnable" : "prompt";
				return new PromptItem(
					basename(pathString),
					TreeItemCollapsibleState.None,
					contextValue,
					{
						resourceUri: uri,
						command,
						source,
					}
				);
			});
	};

	private readonly createLoadingItem = (): PromptItem =>
		new PromptItem(
			t("treeview.loadingPrompts"),
			TreeItemCollapsibleState.None,
			"prompts-loading"
		);

	private readonly getGlobalPromptsRoot = async (): Promise<
		Uri | undefined
	> => {
		try {
			if (isWindowsOrWsl()) {
				const userDataPath = await getVSCodeUserDataPath();
				return joinPath(Uri.file(userDataPath), "prompts");
			}

			const homeUri = Uri.file(homedir());
			return joinPath(homeUri, ".github", "prompts");
		} catch {
			return;
		}
	};

	private readonly getGlobalPromptsLabel = async (): Promise<string> => {
		if (isWindowsOrWsl()) {
			const userDataPath = await getVSCodeUserDataPath();
			return join(userDataPath, "prompts");
		}

		const home = homedir();
		if (!home) {
			return ".github/prompts";
		}

		return `${home}/.github/prompts`;
	};

	private readonly getPromptsRoot = (): Uri | undefined => {
		try {
			const absolutePath = this.configManager.getAbsolutePath("prompts");
			return Uri.file(absolutePath);
		} catch {
			const workspaceUri = workspace.workspaceFolders?.[0]?.uri;
			const fallback = this.configManager.getPath("prompts");
			return workspaceUri ? joinPath(workspaceUri, fallback) : undefined;
		}
	};

	private readonly getInstructionsRoot = (): Uri | undefined => {
		const workspaceUri = workspace.workspaceFolders?.[0]?.uri;
		return workspaceUri
			? joinPath(workspaceUri, ".github", "instructions")
			: undefined;
	};

	private readonly getAgentsRoot = (): Uri | undefined => {
		const workspaceUri = workspace.workspaceFolders?.[0]?.uri;
		return workspaceUri
			? joinPath(workspaceUri, ".github", "agents")
			: undefined;
	};

	private readonly readMarkdownFiles = async (
		dir: Uri,
		suffix: string
	): Promise<string[]> => {
		const results: string[] = [];
		try {
			const entries = await workspace.fs.readDirectory(dir);
			for (const [name, type] of entries) {
				const entryUri = joinPath(dir, name);
				if (type === FileType.File && name.endsWith(suffix)) {
					results.push(entryUri.fsPath);
					continue;
				}

				if (type === FileType.Directory) {
					const nested = await this.readMarkdownFiles(entryUri, suffix);
					results.push(...nested);
				}
			}
		} catch {
			// Directory may not exist yet
		}
		return results;
	};

	private readonly pathExists = async (target: Uri): Promise<boolean> => {
		try {
			await workspace.fs.stat(target);
			return true;
		} catch {
			return false;
		}
	};

	private readonly normalizePromptFileName = (
		name: string,
		isGlobal: boolean
	): string => {
		if (isGlobal) {
			if (name.endsWith(".prompt.md")) {
				return name;
			}
			if (name.endsWith(".md")) {
				// biome-ignore lint/performance/useTopLevelRegex: ignore
				return name.replace(/\.md$/, ".prompt.md");
			}
			return `${name}.prompt.md`;
		}
		return name.endsWith(".md") ? name : `${name}.md`;
	};
}

interface PromptItemOptions {
	resourceUri?: Uri;
	command?: Command;
	tooltip?: string;
	description?: string;
	source?: PromptSource;
}

class PromptItem extends TreeItem {
	readonly contextValue: string;
	readonly source: PromptSource | undefined;

	constructor(
		label: string,
		collapsibleState: TreeItemCollapsibleState,
		contextValue: string,
		options?: PromptItemOptions
	) {
		super(label, collapsibleState);

		this.contextValue = contextValue;
		this.source = options?.source;

		if (options?.command) {
			this.command = options.command;
		}

		const handler = PromptItem.contextHandlers[contextValue];
		if (handler) {
			handler(this, options);
		} else if (options?.tooltip) {
			this.tooltip = options.tooltip;
		}
	}

	private static readonly applyFolderContext = (
		item: PromptItem,
		options?: PromptItemOptions
	): void => {
		item.iconPath = new ThemeIcon("folder");
		item.tooltip = options?.tooltip;
		item.description = options?.description;
	};

	private static readonly formatResourceDescription = (uri: Uri): string => {
		const relativePath = PromptItem.tryGetRelativePath(uri);
		if (relativePath && relativePath.length > 0) {
			return relativePath;
		}

		return uri.fsPath;
	};

	private static readonly tryGetRelativePath = (
		uri: Uri
	): string | undefined => {
		try {
			return workspace.asRelativePath(uri, false);
		} catch {
			return;
		}
	};

	private static readonly contextHandlers: Record<
		string,
		(item: PromptItem, options?: PromptItemOptions) => void
	> = {
		"prompts-loading": (item, options) => {
			item.iconPath = new ThemeIcon("sync~spin");
			item.tooltip = options?.tooltip ?? t("treeview.loadingPrompts");
		},
		"prompts-empty": (item, options) => {
			item.iconPath = new ThemeIcon("info");
			item.tooltip =
				options?.tooltip ??
				t("treeview.createPromptsHint");
		},
		prompt: (item, options) => {
			item.iconPath = new ThemeIcon("file-code");
			if (!options) {
				return;
			}

			if (!options.resourceUri) {
				if (options.tooltip) {
					item.tooltip = options.tooltip;
				}
				if (options.description) {
					item.description = options.description;
				}
				return;
			}

			item.resourceUri = options.resourceUri;
			const description =
				options.description ??
				PromptItem.formatResourceDescription(options.resourceUri);
			item.description = description;
			item.tooltip = options.tooltip ?? description;
		},
		"prompt-runnable": (item, options) => {
			item.iconPath = new ThemeIcon("file-code");
			if (!options) {
				return;
			}

			if (!options.resourceUri) {
				if (options.tooltip) {
					item.tooltip = options.tooltip;
				}
				if (options.description) {
					item.description = options.description;
				}
				return;
			}

			item.resourceUri = options.resourceUri;
			const description =
				options.description ??
				PromptItem.formatResourceDescription(options.resourceUri);
			item.description = description;
			item.tooltip = options.tooltip ?? description;
		},
		"prompt-group-project": PromptItem.applyFolderContext,
		"prompt-group-project-instructions": PromptItem.applyFolderContext,
		"prompt-group-project-agents": PromptItem.applyFolderContext,
		"prompt-group-global": PromptItem.applyFolderContext,
	};
}

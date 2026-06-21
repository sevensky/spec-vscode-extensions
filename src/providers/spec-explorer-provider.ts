import {
	type Command,
	type Event,
	type ExtensionContext,
	type TreeDataProvider,
	EventEmitter,
	ThemeColor,
	ThemeIcon,
	TreeItem,
	TreeItemCollapsibleState,
	workspace,
	Uri,
} from "vscode";
import type { SpecManager } from "../features/spec/spec-manager";
import { t } from "../i18n";

type ChangeStatusState = "missing" | "empty" | "partial" | "complete";

interface ChangeStatus {
	state: ChangeStatusState;
	total: number;
	checked: number;
	percent: number;
}

const PROGRESS_ICON_MAX_BUCKET = 90;

export class SpecExplorerProvider implements TreeDataProvider<SpecItem> {
	static readonly viewId = "openspec-for-agent.views.specExplorer";
	static readonly navigateRequirementsCommandId =
		"openspec-for-agent.spec.navigate.requirements";
	static readonly navigateDesignCommandId =
		"openspec-for-agent.spec.navigate.design";
	static readonly navigateTasksCommandId =
		"openspec-for-agent.spec.navigate.tasks";
	static readonly openSpecCommandId = "openspec-for-agent.spec.open";

	private readonly _onDidChangeTreeData: EventEmitter<
		SpecItem | undefined | null | void
	> = new EventEmitter<SpecItem | undefined | null | void>();
	readonly onDidChangeTreeData: Event<SpecItem | undefined | null | void> =
		this._onDidChangeTreeData.event;

	private specManager!: SpecManager;
	private readonly context: ExtensionContext;

	constructor(context: ExtensionContext) {
		this.context = context;
	}

	setSpecManager(specManager: SpecManager) {
		this.specManager = specManager;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	private async fileExists(relativePath: string): Promise<boolean> {
		if (!workspace.workspaceFolders) {
			return false;
		}
		const uri = Uri.joinPath(workspace.workspaceFolders[0].uri, relativePath);
		try {
			await workspace.fs.stat(uri);
			return true;
		} catch {
			return false;
		}
	}

	private async computeChangeStatus(changeName: string): Promise<ChangeStatus> {
		const tasksPath = `openspec/changes/${changeName}/tasks.md`;

		if (!(await this.fileExists(tasksPath))) {
			return {
				state: "missing",
				total: 0,
				checked: 0,
				percent: 0,
			};
		}

		if (!workspace.workspaceFolders) {
			return {
				state: "missing",
				total: 0,
				checked: 0,
				percent: 0,
			};
		}

		const tasksUri = Uri.joinPath(workspace.workspaceFolders[0].uri, tasksPath);

		try {
			const fileContents = await workspace.fs.readFile(tasksUri);
			const tasksContent = Buffer.from(fileContents).toString("utf8");

			const completeMatches = tasksContent.match(/^\s*-\s*\[x\]\s+.+$/gm) ?? [];
			const incompleteMatches =
				tasksContent.match(/^\s*-\s*\[\s*\]\s+.+$/gm) ?? [];

			const checked = completeMatches.length;
			const total = checked + incompleteMatches.length;

			if (total === 0) {
				return {
					state: "empty",
					total,
					checked,
					percent: 0,
				};
			}

			const percent = Math.floor((checked / total) * 100);

			if (checked === total) {
				return {
					state: "complete",
					total,
					checked,
					percent,
				};
			}

			return {
				state: "partial",
				total,
				checked,
				percent,
			};
		} catch {
			return {
				state: "empty",
				total: 0,
				checked: 0,
				percent: 0,
			};
		}
	}

	getTreeItem(element: SpecItem): TreeItem {
		return element;
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: tree provider branching is clearer than over-abstraction
	async getChildren(element?: SpecItem): Promise<SpecItem[]> {
		if (!(workspace.workspaceFolders && this.specManager)) {
			return [];
		}

		if (!element) {
			return [
				new SpecItem(
					t("treeview.changes"),
					TreeItemCollapsibleState.Expanded,
					"group-changes",
					this.context
				),
				new SpecItem(
					t("treeview.currentSpecs"),
					TreeItemCollapsibleState.Expanded,
					"group-specs",
					this.context
				),
			];
		}

		if (element.contextValue === "group-specs") {
			const specs = await this.specManager.getSpecs();
			return specs.map(
				(name) =>
					new SpecItem(
						name,
						TreeItemCollapsibleState.Collapsed,
						"spec",
						this.context,
						name
					)
			);
		}

		if (element.contextValue === "group-changes") {
			const changes = await this.specManager.getChanges();
			const items = await Promise.all(
				changes.map(async (name) => {
					const changeStatus = await this.computeChangeStatus(name);
					return new SpecItem(
						name,
						TreeItemCollapsibleState.Collapsed,
						"change",
						this.context,
						name,
						undefined,
						undefined,
						undefined,
						undefined,
						changeStatus
					);
				})
			);
			return items;
		}

		if (element.contextValue === "spec") {
			const specPath = `openspec/specs/${element.specName}/spec.md`;
			return [
				new SpecItem(
					t("treeview.spec"),
					TreeItemCollapsibleState.None,
					"spec-document",
					this.context,
					element.specName,
					"spec",
					{
						command: SpecExplorerProvider.openSpecCommandId,
						title: t("treeview.openSpec"),
						arguments: [specPath, "spec"],
					},
					specPath
				),
			];
		}

		if (element.contextValue === "change") {
			const basePath = `openspec/changes/${element.specName}`;
			const items: SpecItem[] = [];

			if (await this.fileExists(`${basePath}/proposal.md`)) {
				items.push(
					new SpecItem(
						t("treeview.proposal"),
						TreeItemCollapsibleState.None,
						"spec-document",
						this.context,
						element.specName,
						"proposal",
						{
							command: SpecExplorerProvider.openSpecCommandId,
							title: t("treeview.openProposal"),
							arguments: [`${basePath}/proposal.md`, "proposal"],
						},
						`${basePath}/proposal.md`
					)
				);
			}

			if (await this.fileExists(`${basePath}/tasks.md`)) {
				items.push(
					new SpecItem(
						t("treeview.tasks"),
						TreeItemCollapsibleState.None,
						"spec-document",
						this.context,
						element.specName,
						"tasks",
						{
							command: SpecExplorerProvider.openSpecCommandId,
							title: t("treeview.openTasks"),
							arguments: [`${basePath}/tasks.md`, "tasks"],
						},
						`${basePath}/tasks.md`
					)
				);
			}

			if (await this.fileExists(`${basePath}/design.md`)) {
				items.push(
					new SpecItem(
						t("treeview.design"),
						TreeItemCollapsibleState.None,
						"spec-document",
						this.context,
						element.specName,
						"design",
						{
							command: SpecExplorerProvider.openSpecCommandId,
							title: t("treeview.openDesign"),
							arguments: [`${basePath}/design.md`, "design"],
						},
						`${basePath}/design.md`
					)
				);
			}

			if (await this.fileExists(`${basePath}/detailed-design.md`)) {
				items.push(
					new SpecItem(
						t("treeview.detailedDesign"),
						TreeItemCollapsibleState.None,
						"spec-document",
						this.context,
						element.specName,
						"detailed-design",
						{
							command: SpecExplorerProvider.openSpecCommandId,
							title: t("treeview.openDetailedDesign"),
							arguments: [`${basePath}/detailed-design.md`, "design"],
						},
						`${basePath}/detailed-design.md`
					)
				);
			}

			items.push(
				new SpecItem(
					t("treeview.specs"),
					TreeItemCollapsibleState.Collapsed,
					"change-specs-group",
					this.context,
					element.specName
				)
			);

			return items;
		}

		if (element.contextValue === "change-specs-group") {
			const specs = await this.specManager.getChangeSpecs(element.specName!);
			return specs.map(
				(name) =>
					new SpecItem(
						name,
						TreeItemCollapsibleState.Collapsed,
						"change-spec",
						this.context,
						name,
						undefined,
						undefined,
						undefined,
						element.specName
					)
			);
		}

		if (element.contextValue === "change-spec") {
			const changeName = element.parentName!;
			const specName = element.specName!;
			const specPath = `openspec/changes/${changeName}/specs/${specName}/spec.md`;

			return [
				new SpecItem(
					t("treeview.spec"),
					TreeItemCollapsibleState.None,
					"spec-document",
					this.context,
					specName,
					"spec",
					{
						command: SpecExplorerProvider.openSpecCommandId,
						title: t("treeview.openSpec"),
						arguments: [specPath, "spec"],
					},
					specPath
				),
			];
		}

		return [];
	}
}

class SpecItem extends TreeItem {
	readonly label: string;
	readonly collapsibleState: TreeItemCollapsibleState;
	readonly contextValue: string;
	private readonly context: ExtensionContext;
	readonly specName?: string;
	readonly documentType?: string;
	readonly command?: Command;
	private readonly filePath?: string;
	readonly parentName?: string;
	readonly changeStatus?: ChangeStatus;

	// biome-ignore lint/nursery/useMaxParams: ignore
	constructor(
		label: string,
		collapsibleState: TreeItemCollapsibleState,
		contextValue: string,
		context: ExtensionContext,
		specName?: string,
		documentType?: string,
		command?: Command,
		filePath?: string,
		parentName?: string,
		changeStatus?: ChangeStatus
	) {
		super(label, collapsibleState);
		this.label = label;
		this.collapsibleState = collapsibleState;
		this.contextValue = contextValue;
		this.context = context;
		this.specName = specName;
		this.documentType = documentType;
		this.command = command;
		this.filePath = filePath;
		this.parentName = parentName;
		this.changeStatus = changeStatus;

		this.updateIconAndTooltip();
	}

	private updateIconAndTooltip() {
		if (this.contextValue === "change") {
			this.updateChangeIconAndTooltip();
			return;
		}

		if (this.contextValue === "spec" || this.contextValue === "change-spec") {
			this.iconPath = new ThemeIcon("package");
			this.tooltip = `${this.contextValue}: ${this.label}`;
			return;
		}

		if (this.contextValue === "spec-document") {
			this.updateDocumentIcon();
			return;
		}

		if (
			this.contextValue.startsWith("group-") ||
			this.contextValue === "change-specs-group"
		) {
			this.iconPath = new ThemeIcon("folder");
		}
	}

	private updateDocumentIcon() {
		// Different icons for different document types
		if (this.documentType === "requirements" || this.documentType === "spec") {
			this.iconPath = new ThemeIcon("chip");
		} else if (this.documentType === "design") {
			this.iconPath = new ThemeIcon("layers");
		} else if (this.documentType === "detailed-design") {
			this.iconPath = new ThemeIcon("file-text");
		} else if (this.documentType === "tasks") {
			this.iconPath = new ThemeIcon("tasklist");
		} else if (this.documentType === "proposal") {
			this.iconPath = new ThemeIcon("lightbulb");
		} else {
			this.iconPath = new ThemeIcon("file");
		}

		this.tooltip = `${this.documentType}: ${this.label}`;

		// Set description to file path
		if (this.filePath) {
			this.description = this.filePath;
		}
	}

	private getProgressBucket(percent: number): number {
		if (percent <= 0) {
			return 0;
		}

		const rounded = Math.round(percent / 10) * 10;
		return Math.min(PROGRESS_ICON_MAX_BUCKET, Math.max(10, rounded));
	}

	private getProgressIconUri(percent: number): Uri {
		const bucket = this.getProgressBucket(percent);
		return Uri.joinPath(
			this.context.extensionUri,
			`icons/progress/progress-${bucket}.svg`
		);
	}

	private updateChangeIconAndTooltip() {
		if (!this.changeStatus) {
			this.iconPath = new ThemeIcon("package");
			this.tooltip = `${this.contextValue}: ${this.label}`;
			return;
		}

		if (this.changeStatus.state === "missing") {
			this.iconPath = new ThemeIcon(
				"warning",
				new ThemeColor("list.warningForeground")
			);
			this.tooltip = t("treeview.noTasksFile");
			this.description = undefined;
			return;
		}

		if (this.changeStatus.state === "empty") {
			this.iconPath = new ThemeIcon(
				"circle-outline",
				new ThemeColor("descriptionForeground")
			);
			this.tooltip = t("treeview.noRecognizedTasks");
			this.description = undefined;
			return;
		}

		if (this.changeStatus.state === "complete") {
			this.iconPath = new ThemeIcon(
				"pass-filled",
				new ThemeColor("charts.green")
			);
			this.tooltip = t("treeview.allTasksComplete");
			this.description = "100%";
			return;
		}

		const progressIconUri = this.getProgressIconUri(this.changeStatus.percent);
		this.iconPath = {
			light: progressIconUri,
			dark: progressIconUri,
		};
		this.tooltip = t("treeview.tasksProgress", {
			checked: String(this.changeStatus.checked),
			total: String(this.changeStatus.total),
			percent: String(this.changeStatus.percent),
		});
		this.description = `${this.changeStatus.percent}%`;
	}
}

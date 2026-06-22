import {
	window,
	workspace,
	type WebviewPanel,
	Uri,
	ViewColumn,
	commands,
} from "vscode";
import { join } from "node:path";
import { SpecContextManager } from "../features/spec-context/spec-context-manager";
import type { SpecContext } from "../types/spec-context.types";
import { getWebviewContent } from "../utils/get-webview-content";

/**
 * SpecViewerProvider — 富 spec 面板（React webview 版）。
 *
 * 点击变更树节点时打开 WebviewPanel，加载 webview-ui 的 spec-viewer React 页，
 * 通过 postMessage 推送 ViewerPayload、接收 switchDoc / footerAction 等动作。
 * 按 change 目录分组，支持多面板并存。
 * 文件变化（.spec-context.json / 文档）时自动刷新。
 *
 * 交互契约对齐 speckit-companion 的 footerAction 单一来源模型，
 * 状态保持粗粒度（active/completed/archived 三态），动作只写状态、不派发 agent 命令。
 */

/** 面板展示的文档类型 */
type DocType = "proposal" | "design" | "tasks" | "specs";

/** footer 动作 id 白名单 */
type FooterActionId = "complete" | "archive" | "reactivate";

interface FooterActionEntry {
	id: FooterActionId;
	label: string;
	variant: "primary" | "secondary";
}

interface PanelState {
	changeName: string;
	currentDoc: DocType;
	availableDocs: Array<{ type: DocType; exists: boolean; content: string }>;
	context: SpecContext;
}

/** 活跃面板注册表：changeName → { panel, state, specsPath } */
const panels = new Map<
	string,
	{ panel: WebviewPanel; state: PanelState; specsPath: string }
>();

/** 工件文件名映射 */
const DOC_FILES: Record<DocType, string> = {
	proposal: "proposal.md",
	design: "design.md",
	tasks: "tasks.md",
	specs: "specs",
};

/** 扩展根 Uri，激活时由 initialize 注入（getWebviewContent 解析脚本/样式用） */
let extensionUri: Uri | undefined;

export class SpecViewerProvider {
	/**
	 * 激活时注入扩展 Uri（用于解析 webview 脚本/样式资源）。
	 */
	static initialize(uri: Uri): void {
		extensionUri = uri;
	}

	/**
	 * 打开（或聚焦）某变更的面板。
	 */
	static async show(changeName: string, specsPath = "openspec"): Promise<void> {
		const existing = panels.get(changeName);
		if (existing) {
			existing.panel.reveal(ViewColumn.One);
			await SpecViewerProvider.updateContent(changeName, specsPath);
			return;
		}

		await SpecViewerProvider.createPanel(changeName, specsPath);
	}

	/**
	 * 创建新面板。
	 */
	private static async createPanel(
		changeName: string,
		specsPath: string
	): Promise<void> {
		const state = await SpecViewerProvider.buildState(
			changeName,
			"proposal",
			specsPath
		);

		const panel = window.createWebviewPanel(
			"openspec-spec-viewer",
			`Spec: ${changeName}`,
			ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: false,
				localResourceRoots: extensionUri ? [extensionUri] : [],
			}
		);

		// 加载 webview-ui 的 spec-viewer React 页（与其它面板共用 getWebviewContent）
		if (extensionUri) {
			panel.webview.html = getWebviewContent(
				panel.webview,
				extensionUri,
				"spec-viewer"
			);
		}

		// 关闭时清理注册表
		panel.onDidDispose(() => {
			panels.delete(changeName);
		});

		// webview ↔ extension 消息：changeName 由本闭包绑定，不信任消息体
		panel.webview.onDidReceiveMessage(async (msg) => {
			const entry = panels.get(changeName);
			if (!entry) {
				return;
			}

			switch (msg.command) {
				case "ready": {
					// 面板就绪 → 推送初始状态
					await SpecViewerProvider.sendState(changeName);
					break;
				}
				case "switchDoc": {
					if (msg.docType) {
						entry.state.currentDoc = msg.docType as DocType;
						await SpecViewerProvider.sendState(changeName);
					}
					break;
				}
				case "footerAction": {
					await SpecViewerProvider.handleFooterAction(
						changeName,
						entry.specsPath,
						msg.id as FooterActionId
					);
					break;
				}
				case "refreshContent": {
					await SpecViewerProvider.updateContent(changeName, entry.specsPath);
					break;
				}
				default:
					// 未知命令忽略
					break;
			}
		});

		panels.set(changeName, { panel, state, specsPath });
	}

	/**
	 * 更新已有面板内容（文件变化时调用）。
	 */
	static async updateContent(
		changeName: string,
		specsPath = "openspec"
	): Promise<void> {
		const entry = panels.get(changeName);
		if (!entry) {
			return;
		}
		const newState = await SpecViewerProvider.buildState(
			changeName,
			entry.state.currentDoc,
			specsPath
		);
		entry.state = newState;
		entry.specsPath = specsPath;
		await SpecViewerProvider.sendState(changeName);
	}

	/**
	 * 刷新正在显示某文件的面板（文件监听器调用）。
	 */
	static async refreshIfDisplaying(
		changeName: string,
		specsPath = "openspec"
	): Promise<void> {
		if (panels.has(changeName)) {
			await SpecViewerProvider.updateContent(changeName, specsPath);
		}
	}

	/**
	 * 把当前 PanelState 组装为 ViewerPayload 并 postMessage 给 webview。
	 */
	private static async sendState(changeName: string): Promise<void> {
		const entry = panels.get(changeName);
		if (!entry) {
			return;
		}
		const payload = SpecViewerProvider.buildPayload(entry.state);
		await entry.panel.webview.postMessage({
			command: "state",
			payload,
		});
	}

	/**
	 * PanelState → ViewerPayload（含 footer catalog 计算，对齐 speckit 单一来源契约）。
	 */
	private static buildPayload(state: PanelState) {
		const { changeName, currentDoc, availableDocs, context } = state;
		return {
			changeName,
			status: context.status,
			step: context.step,
			agent: context.agent,
			currentDoc,
			docs: availableDocs.map((d) => ({
				type: d.type,
				exists: d.exists,
				content: d.content,
			})),
			history: context.history.map((h) => ({
				step: h.step,
				status: h.status,
				at: h.at,
				agent: h.agent,
			})),
			footer: SpecViewerProvider.computeFooter(context.status),
		};
	}

	/**
	 * 按 status 计算 footer 动作 catalog（extension 侧单一来源）。
	 * 粗粒度三态：active→[归档,标记完成]；completed/archived→[重新激活]。
	 */
	private static computeFooter(
		status: SpecContext["status"]
	): FooterActionEntry[] {
		if (status === "active") {
			return [
				{ id: "archive", label: "归档", variant: "secondary" },
				{ id: "complete", label: "标记完成", variant: "primary" },
			];
		}
		// completed | archived
		return [{ id: "reactivate", label: "重新激活", variant: "primary" }];
	}

	/**
	 * footer 动作派发：complete/reactivate 写状态，archive 走既有归档命令 + 二次确认。
	 */
	private static async handleFooterAction(
		changeName: string,
		specsPath: string,
		id: FooterActionId
	): Promise<void> {
		if (id === "complete") {
			await SpecContextManager.setStatus(changeName, "completed", specsPath);
			await SpecViewerProvider.updateContent(changeName, specsPath);
			return;
		}

		if (id === "reactivate") {
			await SpecContextManager.setStatus(changeName, "active", specsPath);
			await SpecViewerProvider.updateContent(changeName, specsPath);
			return;
		}

		if (id === "archive") {
			// 归档不可逆（触发真实 chat 动作 + 移动目录），模态二次确认
			const confirm = await window.showWarningMessage(
				`确认归档变更「${changeName}」？归档将触发 archive 流程并把变更移出 changes/。`,
				{ modal: true },
				"确认归档"
			);
			if (confirm !== "确认归档") {
				return;
			}
			// 复用既有归档命令（读 archive prompt + sendPromptToChat）
			await commands.executeCommand(
				"openspec-for-agent.spec.archiveChange",
				{ specName: changeName }
			);
			await SpecContextManager.setStatus(changeName, "archived", specsPath);
			await SpecViewerProvider.updateContent(changeName, specsPath);
			return;
		}
	}

	/**
	 * 组装面板状态：读取所有文档 + .spec-context.json。
	 */
	private static async buildState(
		changeName: string,
		currentDoc: DocType,
		specsPath: string
	): Promise<PanelState> {
		const workspaceFolder = workspace.workspaceFolders?.[0];
		const changeDir = workspaceFolder
			? join(workspaceFolder.uri.fsPath, specsPath, "changes", changeName)
			: "";

		const docTypes: DocType[] = ["proposal", "design", "tasks", "specs"];
		const availableDocs = await Promise.all(
			docTypes.map(async (type) => {
				const content = await SpecViewerProvider.readFileContent(
					changeDir,
					type
				);
				return { type, exists: content !== null, content: content ?? "" };
			})
		);

		const context = await SpecContextManager.read(changeName, specsPath);

		return { changeName, currentDoc, availableDocs, context };
	}

	/**
	 * 读取某文档内容。specs 是目录，返回其下所有 spec.md 的合并。
	 */
	private static async readFileContent(
		changeDir: string,
		type: DocType
	): Promise<string | null> {
		if (type === "specs") {
			return SpecViewerProvider.readSpecsDir(changeDir);
		}
		const fileName = DOC_FILES[type];
		const uri = Uri.file(join(changeDir, fileName));
		try {
			const data = await workspace.fs.readFile(uri);
			return Buffer.from(data).toString("utf-8");
		} catch {
			return null;
		}
	}

	/**
	 * 读取 specs/ 目录下所有 spec.md 合并。
	 */
	private static async readSpecsDir(changeDir: string): Promise<string | null> {
		const specsDir = Uri.file(join(changeDir, "specs"));
		try {
			const entries = await workspace.fs.readDirectory(specsDir);
			const specDirs = entries.filter(([, type]) => type === 2); // Directory=2
			if (specDirs.length === 0) {
				return null;
			}
			const contents = await Promise.all(
				specDirs.map(async ([name]) => {
					const uri = Uri.file(join(changeDir, "specs", name, "spec.md"));
					try {
						const data = await workspace.fs.readFile(uri);
						return `### ${name}\n\n${Buffer.from(data).toString("utf-8")}`;
					} catch {
						return null;
					}
				})
			);
			return contents
				.filter((c): c is string => c !== null)
				.join("\n\n---\n\n");
		} catch {
			return null;
		}
	}
}

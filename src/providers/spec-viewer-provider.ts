import { window, workspace, type WebviewPanel, Uri, ViewColumn } from "vscode";
import { join } from "node:path";
import { SpecContextManager } from "../features/spec-context/spec-context-manager";
import type { SpecContext } from "../types/spec-context.types";

/**
 * SpecViewerProvider — 富 spec 面板。
 *
 * 点击变更树节点时打开 WebviewPanel，展示该变更的文档内容 + 当前 step/status/history。
 * 按 change 目录分组，支持多面板并存。
 * 文件变化（.spec-context.json）时自动刷新。
 */

/** 面板展示的文档类型 */
type DocType = "proposal" | "design" | "tasks" | "specs";

interface PanelState {
	changeName: string;
	currentDoc: DocType;
	availableDocs: Array<{ type: DocType; exists: boolean; content: string }>;
	context: SpecContext;
}

/** 活跃面板注册表：changeName → { panel, state } */
const panels = new Map<string, { panel: WebviewPanel; state: PanelState }>();

/** 工件文件名映射 */
const DOC_FILES: Record<DocType, string> = {
	proposal: "proposal.md",
	design: "design.md",
	tasks: "tasks.md",
	specs: "specs",
};

export class SpecViewerProvider {
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
			}
		);

		panel.webview.html = SpecViewerProvider.renderHtml(state);

		// 关闭时清理注册表
		panel.onDidDispose(() => {
			panels.delete(changeName);
		});

		// webview 消息：切换文档 / 触发动作
		panel.webview.onDidReceiveMessage((msg) => {
			if (msg.command === "switchDoc" && msg.docType) {
				const st = panels.get(changeName);
				if (st) {
					st.state.currentDoc = msg.docType as DocType;
					panel.webview.html = SpecViewerProvider.renderHtml(st.state);
				}
			}
		});

		panels.set(changeName, { panel, state });
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
		entry.panel.webview.html = SpecViewerProvider.renderHtml(newState);
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

	/**
	 * 渲染面板 HTML（纯 HTML/JS，不引入框架）。
	 */
	private static renderHtml(state: PanelState): string {
		const { changeName, currentDoc, availableDocs, context } = state;
		const currentDocData = availableDocs.find((d) => d.type === currentDoc);

		// 文档 tab
		const tabs = availableDocs
			.map((d) => {
				const active = d.type === currentDoc ? ' class="active"' : "";
				const label = d.type.charAt(0).toUpperCase() + d.type.slice(1);
				const badge = d.exists ? "" : ' <span class="missing">缺失</span>';
				return `<button${active} onclick="switchDoc('${d.type}')">${label}${badge}</button>`;
			})
			.join("");

		// 状态驱动的按钮
		const actionButtons = SpecViewerProvider.renderActionButtons(context);

		// 历史时间线
		const history = context.history
			.map((h) => `<li>${h.step} · ${h.status} · ${h.agent} · ${h.at}</li>`)
			.join("");

		// 文档内容（简单转义后放进 pre）
		const docContent = currentDocData?.exists
			? SpecViewerProvider.escapeHtml(currentDocData.content)
			: '<p class="empty">该文档暂未创建</p>';

		return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Spec: ${SpecViewerProvider.escapeHtml(changeName)}</title>
<style>
	body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; padding: 16px; }
	.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
	.header h1 { font-size: 1.2em; margin: 0; }
	.status-badge { padding: 2px 8px; border-radius: 3px; font-size: 0.85em; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
	.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--vscode-panel-border); margin-bottom: 12px; }
	.tabs button { background: none; border: none; color: var(--vscode-foreground); padding: 6px 12px; cursor: pointer; border-bottom: 2px solid transparent; opacity: 0.7; }
	.tabs button.active { border-bottom-color: var(--vscode-focusBorder); opacity: 1; }
	.tabs button .missing { color: var(--vscode-errorForeground); font-size: 0.75em; }
	.actions { display: flex; gap: 8px; margin-bottom: 12px; }
	.actions button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 4px 12px; cursor: pointer; border-radius: 2px; }
	.actions button:hover { background: var(--vscode-button-hoverBackground); }
	.content { white-space: pre-wrap; font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size); line-height: 1.5; }
	.content .empty { color: var(--vscode-descriptionForeground); font-style: italic; }
	.sidebar { float: right; width: 240px; margin-left: 16px; }
	.sidebar h3 { font-size: 0.9em; margin: 0 0 6px; }
	.sidebar ul { list-style: none; padding: 0; font-size: 0.8em; color: var(--vscode-descriptionForeground); }
	.sidebar li { padding: 2px 0; }
	.main { margin-right: 256px; }
</style>
</head>
<body>
<div class="header">
	<h1>${SpecViewerProvider.escapeHtml(changeName)}</h1>
	<span class="status-badge">${context.status} · ${context.step} · ${context.agent}</span>
</div>
<div class="actions">${actionButtons}</div>
<div class="sidebar">
	<h3>历史</h3>
	<ul>${history || "<li>暂无</li>"}</ul>
</div>
<div class="main">
	<div class="tabs">${tabs}</div>
	<div class="content">${docContent}</div>
</div>
<script>
	const vscode = acquireVsCodeApi();
	function switchDoc(docType) {
		vscode.postMessage({ command: 'switchDoc', docType });
	}
</script>
</body>
</html>`;
	}

	/**
	 * 按 status 渲染动作按钮。
	 */
	private static renderActionButtons(context: SpecContext): string {
		const buttons: string[] = [];
		if (context.status === "active") {
			buttons.push(
				"<button onclick=\"alert('标记完成（待接入 provider）')\">标记完成</button>"
			);
			buttons.push(
				"<button onclick=\"alert('归档（待接入 provider）')\">归档</button>"
			);
		} else if (
			context.status === "completed" ||
			context.status === "archived"
		) {
			buttons.push(
				"<button onclick=\"alert('重新激活（待接入 provider）')\">重新激活</button>"
			);
		}
		return buttons.join("");
	}

	/**
	 * HTML 转义。
	 */
	private static escapeHtml(text: string): string {
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}
}

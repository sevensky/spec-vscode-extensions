import {
	workspace,
	type Disposable,
	type FileSystemWatcher,
	type Uri,
} from "vscode";
import { join } from "node:path";

/**
 * SpecContextWatcher — 监听 .spec-context.json 变化，通知订阅者刷新。
 *
 * 监听 openspec/changes/{change}/ .spec-context.json，变化时回调。
 * 用于富面板在状态文件被 agent 更新后自动刷新。
 */
export class SpecContextWatcher implements Disposable {
	private watcher: FileSystemWatcher | undefined;
	private listeners: Array<(changeName: string) => void> = [];

	/**
	 * 启动监听。
	 * @param specsPath openspec 目录（默认 "openspec"）
	 */
	start(specsPath = "openspec"): void {
		this.dispose();

		const workspaceFolder = workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			return;
		}

		// glob: 匹配 openspec/changes/{change}/.spec-context.json
		const pattern = join(specsPath, "changes", "*", ".spec-context.json");
		this.watcher = workspace.createFileSystemWatcher(pattern);

		this.watcher.onDidChange((uri) => this.notify(uri));
		this.watcher.onDidCreate((uri) => this.notify(uri));
	}

	/**
	 * 从文件 URI 提取 change 名并通知订阅者。
	 * 路径形如 .../openspec/changes/<变更名>/.spec-context.json
	 */
	private notify(uri: Uri): void {
		const segments = uri.fsPath.split("/");
		// .spec-context.json 的父目录名就是 change 名
		// segments: [..., "changes", "<changeName>", ".spec-context.json"]
		const ctxIndex = segments.indexOf(".spec-context.json");
		if (ctxIndex > 0) {
			const changeName = segments[ctxIndex - 1];
			for (const listener of this.listeners) {
				try {
					listener(changeName);
				} catch {
					// 订阅者异常不影响其他订阅者
				}
			}
		}
	}

	/**
	 * 注册状态变化监听。返回取消注册的函数。
	 */
	onChange(listener: (changeName: string) => void): Disposable {
		this.listeners.push(listener);
		return {
			dispose: () => {
				this.listeners = this.listeners.filter((l) => l !== listener);
			},
		};
	}

	dispose(): void {
		this.watcher?.dispose();
		this.watcher = undefined;
	}
}

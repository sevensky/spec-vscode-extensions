import { homedir } from "os";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import { execFileSync } from "child_process";
import {
	FileType,
	Uri,
	window,
	workspace,
	type Terminal,
} from "vscode";
import { t } from "../i18n";

/**
 * ClaudeService — 通过终端调用 Claude Code CLI 发送 prompt。
 *
 * 与 CodexService（临时文件 + chatgpt.addToThread 命令）不同，
 * Claude 走终端 CLI 路径：
 *   1. 写 prompt 到 ~/.claude/.tmp/ 临时文件
 *   2. 创建终端，sendText('claude "$(cat <tmpfile>)"')
 *   3. 30s 后清理临时文件（best-effort）
 *
 * 依赖外部 `claude` CLI 已安装。未安装时提示用户并建议回退。
 */
export class ClaudeService {
	private static readonly RETENTION_DAYS = 7;
	private static readonly CLEANUP_DELAY_MS = 30_000;
	private static readonly CLAUDE_BINARY = "claude";

	static addPromptToThread = async (prompt: string): Promise<void> => {
		// 1. 检测 claude CLI 是否可用（降级处理，对应 spec: 未安装时的降级）
		if (!this.isClaudeInstalled()) {
			await window.showErrorMessage(
				t("claude.notInstalled"),
				t("common.ok"),
			);
			return;
		}

		// 2. 清理旧临时文件
		await this.cleanupOldTempFiles();

		// 3. 写 prompt 到临时文件
		const targetUri = this.buildClaudeTempFileUri();
		await this.writeTempFile(targetUri, prompt);
		const filePath = targetUri.fsPath;

		// 4. 创建终端并发送命令
		const terminal = window.createTerminal({
			name: "OpenSpec - Claude Code",
			cwd: workspace.workspaceFolders?.[0]?.uri.fsPath,
		});
		terminal.show();

		// 用 $(cat <file>) 注入 prompt 内容，避免命令行长度/转义问题
		terminal.sendText(`claude "$(cat '${filePath.replace(/'/g, "'\\''")}')"; rm -f '${filePath}'`, true);

		// 5. 延迟清理（best-effort，兜底，对应 spec: 临时文件与清理策略）
		this.scheduleCleanup(filePath);
	};

	/**
	 * 检测 claude CLI 是否可用。best-effort：任何异常都视为未安装。
	 */
	private static isClaudeInstalled = (): boolean => {
		try {
			execFileSync(this.CLAUDE_BINARY, ["--version"], {
				stdio: "ignore",
				timeout: 3_000,
			});
			return true;
		} catch {
			return false;
		}
	};

	private static cleanupOldTempFiles = async (): Promise<void> => {
		try {
			const dir = join(homedir(), ".claude", ".tmp");
			const dirUri = Uri.file(dir);
			await workspace.fs.createDirectory(dirUri);

			const entries = await workspace.fs.readDirectory(dirUri);
			const now = Date.now();
			const cutoff = now - ClaudeService.RETENTION_DAYS * 24 * 60 * 60 * 1000;

			await Promise.all(
				entries.map(async ([name, type]) => {
					if (type !== FileType.File || !name.endsWith(".md")) {
						return;
					}

					const fileUri = Uri.joinPath(dirUri, name);

					try {
						const stat = await workspace.fs.stat(fileUri);
						if (stat.mtime < cutoff) {
							await workspace.fs.delete(fileUri, { useTrash: false });
						}
					} catch {
						// Best-effort cleanup; ignore failures.
					}
				}),
			);
		} catch {
			// Best-effort cleanup; ignore failures.
		}
	};

	private static buildClaudeTempFileUri = (): ReturnType<typeof Uri.file> => {
		const now = new Date();
		const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
		const uuid = randomUUID();

		const dir = join(homedir(), ".claude", ".tmp");
		const filename = `${yyyymmdd}-${uuid}.md`;

		return Uri.file(join(dir, filename));
	};

	private static writeTempFile = async (
		uri: ReturnType<typeof Uri.file>,
		content: string,
	): Promise<void> => {
		const dirUri = Uri.file(dirname(uri.fsPath));
		await workspace.fs.createDirectory(dirUri);
		await workspace.fs.writeFile(uri, new TextEncoder().encode(content));
	};

	/**
	 * 延迟删除临时文件（best-effort）。命令本身已带 rm，这里是兜底。
	 */
	private static scheduleCleanup = (filePath: string): void => {
		setTimeout(() => {
			try {
				const fs = require("fs");
				fs.promises.unlink(filePath).catch(() => {});
			} catch {
				// Best-effort; ignore.
			}
		}, ClaudeService.CLEANUP_DELAY_MS);
	};

	// 测试辅助：暴露引用便于 mock 验证（不对外）
	static _test = { CLEANUP_DELAY_MS: 30_000 };
}

export type { Terminal };

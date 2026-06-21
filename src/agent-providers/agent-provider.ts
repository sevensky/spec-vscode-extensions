import { window, workspace } from "vscode";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * AgentProvider — 所有 agent 的统一桥接接口（模板方法模式）。
 *
 * 终端派（claude/codebuddy/trae-cli/codex）继承 CliTerminalProvider，
 * 只需声明 binary 名；基类管临时文件+终端+清理（提炼自 ClaudeService）。
 * Chat 派（github-copilot）override executeInTerminal 走 Chat API。
 *
 * 设计参考 speckit-companion 的 CliTerminalProvider 模板方法，
 * 但精简为 bairui-spec 所需（无 headless/WSL/shell 检测）。
 */

export type ProviderType = "terminal" | "chat";

export type AgentId =
	| "github-copilot"
	| "codex"
	| "claude"
	| "trae"
	| "codebuddy"
	| "zcode";

export interface AgentProvider {
	readonly type: ProviderType;
	readonly id: AgentId;
	executeInTerminal(prompt: string, title: string): Promise<void>;
}

/** 临时文件清理延迟（ms），与 ClaudeService 保持一致 */
const CLEANUP_DELAY_MS = 30_000;

/**
 * 检测 binary 是否安装（best-effort）。
 */
function isBinaryInstalled(binary: string): boolean {
	try {
		execFileSync(binary, ["--version"], { stdio: "ignore", timeout: 3000 });
		return true;
	} catch (_e) {
		return false;
	}
}

/**
 * 终端派抽象基类（模板方法）。
 *
 * executeInTerminal 是流程骨架：
 *   ensureInstalled → 写临时文件 → 创建终端 → sendText → scheduleCleanup
 *
 * 子类只需声明 cliBinary（+ 可选 terminalTitle）。
 * 临时文件机制提炼自 ClaudeService，解决长 prompt 命令行长度/转义问题。
 */
export abstract class CliTerminalProvider implements AgentProvider {
	readonly type = "terminal" as const;
	abstract readonly id: AgentId;

	/** CLI binary 名（claude / cbc / trae-cli / codex） */
	protected abstract readonly cliBinary: string;

	/** 终端标题 */
	protected readonly terminalTitle = "OpenSpec Agent";

	async executeInTerminal(prompt: string, title: string): Promise<void> {
		if (!isBinaryInstalled(this.cliBinary)) {
			await window.showErrorMessage(
				`Agent "${this.id}" 的 CLI (${this.cliBinary}) 未安装，请先安装。`
			);
			return;
		}

		// 写 prompt 到临时文件（避免长 prompt 命令行问题）
		const filePath = await this.writeTempFile(prompt);

		// 创建终端并发送命令：binary "$(cat '<file>')"; rm -f '<file>'
		const terminal = window.createTerminal({
			name: title || this.terminalTitle,
			cwd: workspace.workspaceFolders?.[0]?.uri.fsPath,
		});
		terminal.show();
		const escapedPath = filePath.replace(/'/g, "'\\''");
		terminal.sendText(
			`${this.cliBinary} "$(cat '${escapedPath}')"; rm -f '${escapedPath}'`,
			true
		);

		// 兜底清理（命令已带 rm，这是 best-effort）
		this.scheduleCleanup(filePath);
	}

	/**
	 * 写 prompt 到临时文件，返回文件路径。
	 * 各 agent 可覆盖用不同目录（claude 用 ~/.claude/.tmp/）。
	 */
	protected async writeTempFile(content: string): Promise<string> {
		const dir = join(homedir(), ".openspec-agent", ".tmp");
		const now = new Date();
		const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
		const filename = `${yyyymmdd}-${randomUUID()}.md`;
		const fullPath = join(dir, filename);

		const { Uri } = await import("vscode");
		await workspace.fs.createDirectory(Uri.file(dir));
		await workspace.fs.writeFile(
			Uri.file(fullPath),
			new TextEncoder().encode(content)
		);
		return fullPath;
	}

	protected scheduleCleanup(filePath: string): void {
		setTimeout(() => {
			try {
				require("fs")
					.promises.unlink(filePath)
					.catch((_err: unknown) => undefined);
				// biome-ignore lint/suspicious/noEmptyBlockStatements: best-effort 忽略清理失败
			} catch (_e) {}
		}, CLEANUP_DELAY_MS);
	}
}

/**
 * Claude 终端派 provider。
 * 委托 ClaudeService（成熟实现：~/.claude/.tmp 目录 + RETENTION_DAYS 清理 + 降级提示），
 * 不重写临时文件逻辑——单一真相源在 ClaudeService。
 */
export class ClaudeCliProvider implements AgentProvider {
	readonly type = "terminal" as const;
	readonly id = "claude" as const;

	async executeInTerminal(prompt: string, _title: string): Promise<void> {
		const { ClaudeService } = await import("../services/claude-service");
		await ClaudeService.addPromptToThread(prompt);
	}
}

/** CodeBuddy 终端派 provider（binary: cbc） */
export class CodebuddyCliProvider extends CliTerminalProvider {
	readonly id = "codebuddy" as const;
	protected readonly cliBinary = "cbc";
	protected readonly terminalTitle = "OpenSpec - CodeBuddy";
}

/** Trae 终端派 provider（binary: trae-cli） */
export class TraeCliProvider extends CliTerminalProvider {
	readonly id = "trae" as const;
	protected readonly cliBinary = "trae-cli";
	protected readonly terminalTitle = "OpenSpec - Trae";
}

/**
 * Codex provider。
 * 委托 CodexService（成熟实现：临时文件 + chatgpt.addToThread 命令）。
 */
export class CodexCliProvider implements AgentProvider {
	readonly type = "terminal" as const;
	readonly id = "codex" as const;

	async executeInTerminal(prompt: string, _title: string): Promise<void> {
		const { CodexService } = await import("../services/codex-service");
		await CodexService.addPromptToThread(prompt);
	}
}

/**
 * Copilot Chat 派：走 workbench.action.chat.open（保留现有行为）。
 * Override executeInTerminal，不经终端。
 */
export class CopilotProvider implements AgentProvider {
	readonly type = "chat" as const;
	readonly id = "github-copilot" as const;

	async executeInTerminal(prompt: string, _title: string): Promise<void> {
		const { commands } = await import("vscode");
		await commands.executeCommand("workbench.action.chat.open", {
			query: prompt,
		});
	}
}

/**
 * 预留 provider：协议不兼容终端派（如 zcode 为 stdio server）。
 */
export class UnsupportedAgentProvider implements AgentProvider {
	readonly type = "terminal" as const;
	readonly id: AgentId;
	private readonly reason: string;

	constructor(id: AgentId, reason: string) {
		this.id = id;
		this.reason = reason;
	}

	async executeInTerminal(_prompt: string, _title: string): Promise<void> {
		await window.showErrorMessage(
			`Agent "${this.id}" ${this.reason}，暂不支持终端派触发。`
		);
	}
}

/** agent → provider 映射 */
const providerMap: Record<AgentId, AgentProvider> = {
	claude: new ClaudeCliProvider(),
	codebuddy: new CodebuddyCliProvider(),
	trae: new TraeCliProvider(),
	codex: new CodexCliProvider(),
	"github-copilot": new CopilotProvider(),
	zcode: new UnsupportedAgentProvider(
		"zcode",
		"为 stdio server 架构，与终端派协议不兼容"
	),
};

export function getAgentProvider(agent: AgentId): AgentProvider {
	return providerMap[agent] ?? providerMap["github-copilot"];
}

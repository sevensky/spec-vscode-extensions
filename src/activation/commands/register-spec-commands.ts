import { commands, env, window, workspace } from "vscode";
import type { ExtensionContext, Uri } from "vscode";
import { t } from "../../i18n";
import type { SpecExplorerProvider } from "../../providers/spec-explorer-provider";
import type { ExtensionServices } from "../extension-services";
import { createDetailedDesignCommandHandler } from "../../features/spec/commands/create-detailed-design";
import { createGitHubIssueCommandHandler } from "../../features/spec/commands/create-github-issue";
import { updateSpecsFromDetailedDesignCommandHandler } from "../../features/spec/commands/update-specs-from-detailed-design";
import { reviewChangeCommandHandler } from "../../features/spec/commands/review-change";
import { sendPromptToChat } from "../../utils/chat-prompt-runner";
import { ConfigManager } from "../../utils/config-manager";
import { readPromptFile } from "../../utils/openspec-prompt-utils";
import { SpecViewerProvider } from "../../providers/spec-viewer-provider";
/** 提取 change 名的前缀正则（兼容 "openspec/changes/<name>/..." 与 "changes/<name>/..."） */
const CHANGES_PREFIX = /^(?:openspec\/)?changes\//;
/** 诊断命令用的关键词匹配正则 */
const CHAT_CMD_REGEX = /chat|ai|trae|assistant|message|prompt|ask|llm/i;

interface SpecCommandItem {
	label?: string;
	specName?: string;
}

export const registerSpecCommands = (
	context: ExtensionContext,
	services: ExtensionServices,
	specExplorer: SpecExplorerProvider
) => {
	const { outputChannel, specManager } = services;

	const createSpecCommand = commands.registerCommand(
		"openspec-for-agent.spec.create",
		async () => {
			outputChannel.appendLine(
				`[Spec] create command triggered at ${new Date().toISOString()}`
			);

			try {
				await specManager.create();
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				outputChannel.appendLine(`[Spec] create command failed: ${message}`);
				window.showErrorMessage(
					t("error.createSpecPromptFailed", { msg: String(message) })
				);
			}
		}
	);

	context.subscriptions.push(
		commands.registerCommand("openspec-for-agent.noop", () => {
			// noop
		}),
		createSpecCommand,
		commands.registerCommand(
			"openspec-for-agent.spec.navigate.requirements",
			async (specName: string) => {
				await specManager.navigateToDocument(specName, "requirements");
			}
		),
		commands.registerCommand(
			"openspec-for-agent.spec.navigate.design",
			async (specName: string) => {
				await specManager.navigateToDocument(specName, "design");
			}
		),
		commands.registerCommand(
			"openspec-for-agent.spec.navigate.tasks",
			async (specName: string) => {
				await specManager.navigateToDocument(specName, "tasks");
			}
		),
		commands.registerCommand(
			"openspec-for-agent.spec.implTask",
			async (documentUri: Uri) => {
				outputChannel.appendLine(
					`[Task Execute] Generating OpenSpec apply prompt for: ${documentUri.fsPath}`
				);
				await specManager.runOpenSpecApply(documentUri);
			}
		),
		commands.registerCommand(
			"openspec-for-agent.spec.implTaskSingle",
			async (documentUri: Uri, taskLineNumber: number, taskText: string) => {
				outputChannel.appendLine(
					`[Task Execute Single] Executing task ${taskLineNumber}: ${taskText}`
				);
				try {
					await specManager.runOpenSpecApply(documentUri, {
						taskNumber: taskLineNumber,
						taskText,
					});
				} catch (error) {
					const message =
						error instanceof Error ? error.message : String(error);
					outputChannel.appendLine(`[Task Execute Single] Failed: ${message}`);
					window.showErrorMessage(
						t("task.executeFailed", { msg: String(message) })
					);
				}
			}
		),
		commands.registerCommand(
			"openspec-for-agent.spec.open",
			async (relativePath: string, _type: string) => {
				// 点击树节点 → 按路径类型分流：
				//   - change 路径（openspec/changes/<name>/...）→ 打开富面板展示该变更全貌
				//   - 非 change 路径（如 openspec/specs/<name>/spec.md 顶层 spec）→ 无对应 change，
				//     回退到 markdown 编辑器打开（与 openSource 一致），避免拼出无效 change 面板
				if (!CHANGES_PREFIX.test(relativePath)) {
					await specManager.openDocument(relativePath, _type);
					return;
				}
				const changeName = relativePath
					.replace(CHANGES_PREFIX, "")
					.split("/")[0];
				if (changeName) {
					await SpecViewerProvider.show(changeName);
				}
			}
		),
		commands.registerCommand(
			"openspec-for-agent.spec.openSource",
			async (relativePath: string, type: string) => {
				// 右键"打开源文件" → 保留原行为（markdown 编辑器打开）
				await specManager.openDocument(relativePath, type);
			}
		),
		// biome-ignore lint/suspicious/useAwait: ignore
		commands.registerCommand("openspec-for-agent.spec.refresh", async () => {
			outputChannel.appendLine("[Manual Refresh] Refreshing spec explorer...");
			specExplorer.refresh();
		}),
		commands.registerCommand(
			"openspec-for-agent.spec.delete",
			async (item: SpecCommandItem) => {
				const label = item?.label;
				if (!label) {
					window.showErrorMessage(t("error.determineItemName"));
					return;
				}
				await specManager.delete(label);
			}
		),
		commands.registerCommand(
			"openspec-for-agent.spec.copyName",
			async (item: SpecCommandItem) => {
				const name: string | undefined = item?.specName ?? item?.label;
				if (!name) {
					window.showErrorMessage(t("error.determineItemName"));
					return;
				}
				await env.clipboard.writeText(name);
				window.setStatusBarMessage(`Copied: ${name}`, 2000);
			}
		),
		commands.registerCommand(
			"openspec-for-agent.spec.createDetailedDesign",
			createDetailedDesignCommandHandler(services, specExplorer)
		),
		commands.registerCommand(
			"openspec-for-agent.spec.updateSpecsFromDetailedDesign",
			updateSpecsFromDetailedDesignCommandHandler(services, specExplorer)
		),
		commands.registerCommand(
			"openspec-for-agent.spec.archiveChange",
			async (item: SpecCommandItem) => {
				const changeId: string | undefined = item?.specName;
				if (!changeId) {
					window.showErrorMessage(t("error.determineChangeId"));
					return;
				}

				const ws = workspace.workspaceFolders?.[0];
				if (!ws) {
					window.showErrorMessage(t("common.noWorkspace"));
					return;
				}

				try {
					const { aiAgent } = ConfigManager.getInstance().getSettings();
					const result = await readPromptFile(ws.uri, aiAgent, "archive");
					if (result.isLegacy) {
						outputChannel.appendLine(
							`[Archive Change] Using legacy prompt file: ${result.filePath}`
						);
					}
					const fullPrompt = `${result.content}\n\nid: ${changeId}`;

					outputChannel.appendLine(
						`[Archive Change] Archiving change: ${changeId}`
					);
					await sendPromptToChat(fullPrompt, {
						instructionType: "archiveChange",
					});
				} catch (error) {
					const message =
						error instanceof Error ? error.message : String(error);
					window.showErrorMessage(
						t("error.readArchivePromptFailed", { msg: String(message) })
					);
				}
			}
		),
		commands.registerCommand(
			"openspec-for-agent.spec.createGitHubIssue",
			createGitHubIssueCommandHandler(services)
		),
		commands.registerCommand(
			"openspec-for-agent.spec.reviewChange",
			reviewChangeCommandHandler(services, specExplorer)
		)
	);

	// 临时诊断：列出所有 chat/ai/trae/assistant 相关命令
	const diagCmd = commands.registerCommand(
		"openspec-for-agent.diagnoseChatCommands",
		async () => {
			const allCmds = await commands.getCommands(true);
			const matched = allCmds.filter((c) => CHAT_CMD_REGEX.test(c)).sort();
			const msg = `找到 ${matched.length} 个相关命令:\n${matched.join("\n")}`;
			outputChannel.appendLine(msg);
			outputChannel.show();
			const item = await window.showInformationMessage(
				`找到 ${matched.length} 个相关命令，已输出到 Output`,
				"查看 Output"
			);
			if (item) {
				outputChannel.show();
			}
		}
	);
	context.subscriptions.push(diagCmd);
};

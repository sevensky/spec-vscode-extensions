import { homedir } from "os";
import { basename, join } from "node:path";
import { commands, Uri, window, workspace } from "vscode";
import type { ExtensionContext } from "vscode";
import type { PromptsExplorerProvider } from "../../providers/prompts-explorer-provider";
import { sendPromptToChat } from "../../utils/chat-prompt-runner";
import { ConfigManager } from "../../utils/config-manager";
import { t } from "../../i18n";
import type { ExtensionServices } from "../extension-services";

export const registerPromptsCommands = (
	context: ExtensionContext,
	services: ExtensionServices,
	promptsExplorer: PromptsExplorerProvider
) => {
	const { outputChannel } = services;

	context.subscriptions.push(
		commands.registerCommand("openspec-for-agent.prompts.refresh", () => {
			outputChannel.appendLine(
				"[Manual Refresh] Refreshing prompts explorer..."
			);
			promptsExplorer.refresh();
		}),
		commands.registerCommand(
			"openspec-for-agent.prompts.createInstructions",
			async () => {
				await commands.executeCommand("workbench.command.new.instructions");
			}
		),
		commands.registerCommand(
			"openspec-for-agent.prompts.createCopilotPrompt",
			async () => {
				await commands.executeCommand("workbench.command.new.prompt");
			}
		),
		commands.registerCommand(
			"openspec-for-agent.prompts.create",
			async (item?: any) => {
				const ws = workspace.workspaceFolders?.[0];
				if (!ws) {
					window.showErrorMessage(t("common.noWorkspace"));
					return;
				}

				const configManager = ConfigManager.getInstance();

				let targetDir: Uri;
				let promptsPathLabel: string;

				if (item?.source === "global") {
					const home = homedir();
					const globalPath = join(home, ".github", "prompts");
					targetDir = Uri.file(globalPath);
					promptsPathLabel = globalPath;
				} else {
					promptsPathLabel = configManager.getPath("prompts");
					targetDir = Uri.joinPath(ws.uri, ".copilot", "prompts");
					try {
						targetDir = Uri.file(configManager.getAbsolutePath("prompts"));
					} catch {
						// fall back to default under workspace
					}
				}

				const name = await window.showInputBox({
					title: t("prompt.create.title"),
					placeHolder: t("prompt.create.placeHolder"),
					prompt: t("prompt.create.promptLabel", { path: promptsPathLabel }),
					validateInput: (value) =>
						value ? undefined : t("prompt.create.nameRequired"),
				});
				if (!name) {
					return;
				}

				const file = Uri.joinPath(targetDir, `${name}.prompt.md`);
				try {
					await workspace.fs.createDirectory(targetDir);
					const content = Buffer.from(
						`# ${name}\n\n${t("prompt.templatePlaceholder")}\n`
					);
					await workspace.fs.writeFile(file, content);
					const doc = await workspace.openTextDocument(file);
					await window.showTextDocument(doc);
					promptsExplorer.refresh();
				} catch (error) {
					window.showErrorMessage(
						t("error.createPromptFailed", { msg: String(error) })
					);
				}
			}
		),
		commands.registerCommand(
			"openspec-for-agent.prompts.run",
			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ignore
			async (filePathOrItem?: any) => {
				try {
					let targetUri: Uri | undefined;

					if (typeof filePathOrItem === "string") {
						targetUri = Uri.file(filePathOrItem);
					} else if (filePathOrItem && typeof filePathOrItem === "object") {
						const candidateUri: Uri | undefined =
							filePathOrItem.resourceUri ??
							(typeof filePathOrItem.resourcePath === "string"
								? Uri.file(filePathOrItem.resourcePath)
								: undefined);

						if (candidateUri) {
							targetUri = candidateUri;
						}
					}

					if (!targetUri) {
						targetUri = window.activeTextEditor?.document.uri;
					}

					if (!targetUri) {
						window.showErrorMessage(t("error.noPromptSelected"));
						return;
					}

					const fileData = await workspace.fs.readFile(targetUri);
					const promptContent = new TextDecoder().decode(fileData);
					await sendPromptToChat(promptContent, {
						instructionType: "runPrompt",
					});
				} catch (error) {
					window.showErrorMessage(
						t("error.runPromptFailed", { msg: String(error) })
					);
				}
			}
		),
		commands.registerCommand(
			"openspec-for-agent.prompts.rename",
			async (item?: any) => {
				await promptsExplorer.renamePrompt(item);
			}
		),
		commands.registerCommand(
			"openspec-for-agent.prompts.delete",
			async (item: any) => {
				if (!item?.resourceUri) {
					return;
				}
				const uri = item.resourceUri as Uri;
				const deleteLabel = t("common.delete");
				const confirm = await window.showWarningMessage(
					t("prompt.create.confirmDelete", { name: basename(uri.fsPath) }),
					{ modal: true },
					deleteLabel
				);
				if (confirm !== deleteLabel) {
					return;
				}
				try {
					await workspace.fs.delete(uri);
					promptsExplorer.refresh();
				} catch (error) {
					window.showErrorMessage(
						t("error.deletePromptFailed", { msg: String(error) })
					);
				}
			}
		),
		commands.registerCommand(
			"openspec-for-agent.prompts.createAgentFile",
			async () => {
				await commands.executeCommand("workbench.command.new.agent");
			}
		)
	);
};

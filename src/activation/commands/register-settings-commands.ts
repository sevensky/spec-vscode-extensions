import { commands, env, Uri, window, workspace } from "vscode";
import type { ExtensionContext } from "vscode";
import { t } from "../../i18n";
import { VSC_CONFIG_NAMESPACE } from "../../constants";
import type { ExtensionServices } from "../extension-services";
import { toggleViews } from "../toggle-views";
import { getVSCodeUserDataPath } from "../../utils/platform-utils";
import { join } from "node:path";

const getMcpConfigPath = async (): Promise<string> => {
	const userDataPath = await getVSCodeUserDataPath();
	return join(userDataPath, "mcp.json");
};

export const registerSettingsCommands = (
	context: ExtensionContext,
	services: ExtensionServices
) => {
	const { outputChannel } = services;

	context.subscriptions.push(
		commands.registerCommand("openspec-for-agent.settings.open", async () => {
			outputChannel.appendLine("Opening OpenSpec settings...");
			await commands.executeCommand(
				"workbench.action.openSettings",
				VSC_CONFIG_NAMESPACE
			);
		}),
		commands.registerCommand(
			"openspec-for-agent.settings.openGlobalConfig",
			async () => {
				outputChannel.appendLine("Opening MCP config...");

				const configPath = await getMcpConfigPath();
				const configUri = Uri.file(configPath);

				try {
					await workspace.fs.stat(configUri);
				} catch {
					window.showWarningMessage(
						t("mcp.configNotFound", { path: configUri.fsPath })
					);
					return;
				}

				try {
					const document = await workspace.openTextDocument(configUri);
					await window.showTextDocument(document, { preview: false });
				} catch (error) {
					const message =
						error instanceof Error ? error.message : String(error);
					window.showErrorMessage(
						t("error.openMcpConfigFailed", { msg: String(message) })
					);
				}
			}
		),
		// biome-ignore lint/suspicious/useAwait: ignore
		commands.registerCommand("openspec-for-agent.help.open", async () => {
			outputChannel.appendLine("Opening OpenSpec help...");
			const helpUrl =
				"https://github.com/sevensky/spec-vscode-extensions#readme";
			env.openExternal(Uri.parse(helpUrl));
		}),
		// biome-ignore lint/suspicious/useAwait: ignore
		commands.registerCommand("openspec-for-agent.help.install", async () => {
			outputChannel.appendLine("Opening OpenSpec installation guide...");
			const installUrl = "https://github.com/Fission-AI/OpenSpec#readme";
			env.openExternal(Uri.parse(installUrl));
		}),
		commands.registerCommand("openspec-for-agent.menu.open", async () => {
			outputChannel.appendLine("Opening OpenSpec menu...");
			await toggleViews();
		})
	);
};

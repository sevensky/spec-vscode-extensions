import { Uri, window, workspace } from "vscode";
import { t } from "../i18n";
import {
	AGENT_COMMAND_CONFIGS,
	type AgentCommandConfig,
	type CommandId,
	COMMAND_IDS,
} from "./agent-command-paths";
import type { AiAgent } from "./config-manager";

export interface PromptFileResult {
	content: string;
	isLegacy: boolean;
	filePath: string;
}

const README_FILENAME = "README.md";

const isFileNotFoundError = (error: unknown): boolean => {
	if (!error || typeof error !== "object") {
		return false;
	}

	const code = "code" in error ? String((error as { code?: string }).code) : "";
	const name = "name" in error ? String((error as { name?: string }).name) : "";

	return (
		code === "FileNotFound" ||
		code === "EntryNotFound" ||
		name === "FileNotFound" ||
		name === "EntryNotFound"
	);
};

/**
 * Reads a prompt file for the given agent and command.
 * The path and filename are determined by the agent's command config.
 */
export const readPromptFile = async (
	workspaceUri: Uri,
	agent: AiAgent,
	commandId: CommandId
): Promise<PromptFileResult> => {
	const config: AgentCommandConfig = AGENT_COMMAND_CONFIGS[agent];
	const ids = COMMAND_IDS[commandId];
	const v1Filename = config.v1Filename(ids.v1);
	const v1Path = Uri.joinPath(workspaceUri, ...config.dir, v1Filename);

	try {
		const fileData = await workspace.fs.readFile(v1Path);
		const content = new TextDecoder().decode(fileData);
		return {
			content,
			isLegacy: false,
			filePath: v1Path.fsPath,
		};
	} catch (error) {
		if (!isFileNotFoundError(error)) {
			throw error;
		}
	}

	// Legacy fallback (only github-copilot has legacy format)
	if (config.legacyFilename) {
		const legacyFilename = config.legacyFilename(ids.legacy);
		const legacyPath = Uri.joinPath(workspaceUri, ...config.dir, legacyFilename);

		try {
			const fileData = await workspace.fs.readFile(legacyPath);
			const content = new TextDecoder().decode(fileData);

			const learnMoreLabel = t("common.learnMore");
			const selection = await window.showWarningMessage(
				createDeprecationWarning(legacyFilename, v1Filename),
				learnMoreLabel
			);
			if (selection === learnMoreLabel) {
				const readmeUri = Uri.joinPath(workspaceUri, README_FILENAME);
				try {
					const doc = await workspace.openTextDocument(readmeUri);
					await window.showTextDocument(doc);
				} catch {
					// Ignore README open failures.
				}
			}

			return {
				content,
				isLegacy: true,
				filePath: legacyPath.fsPath,
			};
		} catch (error) {
			if (!isFileNotFoundError(error)) {
				throw error;
			}
		}
	}

	throw new Error(createMigrationError(agent, commandId, workspaceUri.fsPath));
};

/**
 * Creates a migration error message for a missing prompt file.
 * The message is tailored to the specific agent and command.
 */
export const createMigrationError = (
	agent: AiAgent,
	commandId: CommandId,
	workspacePath: string
): string => {
	const config = AGENT_COMMAND_CONFIGS[agent];
	const ids = COMMAND_IDS[commandId];
	const v1Filename = config.v1Filename(ids.v1);
	const requiredPath = [...config.dir, v1Filename].join("/");
	return t("prompt.migrationError", {
		filename: v1Filename,
		workspace: workspacePath,
		agent,
		requiredPath,
	});
};

export const createDeprecationWarning = (
	legacyFile: string,
	v1File: string
): string =>
	t("prompt.legacyDeprecation", { legacy: legacyFile, current: v1File });

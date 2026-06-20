import { commands } from "vscode";
import { ClaudeService } from "../services/claude-service";
import { CodexService } from "../services/codex-service";
import { ConfigManager } from "./config-manager";

export interface ChatContext {
	instructionType?:
		| "createSpec"
		| "startAllTask"
		| "startSingleTask"
		| "archiveChange"
		| "runPrompt";
}

export const buildChatPrompt = (
	prompt: string,
	context?: ChatContext
): string => {
	const configManager = ConfigManager.getInstance();
	const settings = configManager.getSettings();
	const language = settings.chatLanguage;
	const customInstructions = settings.customInstructions;

	let finalPrompt = prompt;

	// Append global custom instruction
	if (customInstructions.global) {
		finalPrompt += `\n\n${customInstructions.global}`;
	}

	// Append specific custom instruction
	if (context?.instructionType) {
		const specificInstruction = customInstructions[context.instructionType];
		if (specificInstruction) {
			finalPrompt += `\n\n${specificInstruction}`;
		}
	}

	// Append language instruction
	if (language !== "English") {
		// 简体中文用明确的中文指令，比英文 "Please respond in Chinese (Simplified)" 更可靠
		const instruction = language === "Chinese (Simplified)" ? "请用简体中文回答。" : `(Please respond in ${language}.)`;
		finalPrompt += `\n\n${instruction}`;
	}

	return finalPrompt;
};

export const sendPromptToChat = async (
	prompt: string,
	context?: ChatContext
): Promise<void> => {
	const finalPrompt = buildChatPrompt(prompt, context);
	const configManager = ConfigManager.getInstance();
	const { aiAgent } = configManager.getSettings();

	if (aiAgent === "codex") {
		await CodexService.addPromptToThread(finalPrompt);
		return;
	}

	if (aiAgent === "claude") {
		await ClaudeService.addPromptToThread(finalPrompt);
		return;
	}

	await commands.executeCommand("workbench.action.chat.open", {
		query: finalPrompt,
	});
};

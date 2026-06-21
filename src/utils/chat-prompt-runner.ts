import { ConfigManager } from "./config-manager";
import {
	getAgentProvider,
	type AgentId,
} from "../agent-providers/agent-provider";

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
		const instruction =
			language === "Chinese (Simplified)"
				? "请用简体中文回答。"
				: `(Please respond in ${language}.)`;
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

	// 经 provider 抽象路由（claude→ClaudeService委托 / codex→CodexService委托 /
	// codebuddy/trae→CliTerminalProvider / copilot→Chat API / zcode→降级提示）
	const provider = getAgentProvider(aiAgent as AgentId);
	await provider.executeInTerminal(finalPrompt, `OpenSpec - ${aiAgent}`);
};

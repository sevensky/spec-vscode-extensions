import {
	commands,
	Position,
	Range,
	Selection,
	TextEditorRevealType,
	window,
	workspace,
	type TextDocumentShowOptions,
	type Uri,
} from "vscode";
import { AGENT_CHAT_COMMANDS } from "./agent-command-paths";
import { ConfigManager } from "./config-manager";

const selectEntireDocument = async (
	documentUri: Uri,
	showOptions: TextDocumentShowOptions = { preview: false }
) => {
	const targetUriString = documentUri.toString();
	let editor = window.activeTextEditor;
	const matchesTarget = (candidate?: typeof editor) =>
		candidate?.document.uri.toString() === targetUriString;

	if (!matchesTarget(editor)) {
		editor = window.visibleTextEditors.find((item) => matchesTarget(item));
	}

	if (!editor) {
		const document = await workspace.openTextDocument(documentUri);
		editor = await window.showTextDocument(document, showOptions);
	} else if (!matchesTarget(window.activeTextEditor)) {
		await window.showTextDocument(editor.document, showOptions);
	}

	const document = editor.document;
	const lastLineIndex = Math.max(document.lineCount - 1, 0);
	const endPosition = document.lineAt(lastLineIndex).range.end;
	const fullRange = new Range(new Position(0, 0), endPosition);

	editor.selection = new Selection(fullRange.start, fullRange.end);
	editor.revealRange(fullRange, TextEditorRevealType.Default);
};

/**
 * Add a document to the active AI agent's chat.
 *
 * - For github-copilot / codex: selects the entire document and executes
 *   the agent's "add to chat" command (e.g. `chatgpt.addToThread`).
 * - For other agents (claude / trae / codebuddy): selects the entire document
 *   and copies it to the clipboard, since no equivalent chat command exists.
 */
export const addDocumentToAgentChat = async (
	documentUri: Uri,
	showOptions?: TextDocumentShowOptions
): Promise<void> => {
	await selectEntireDocument(documentUri, showOptions);

	const { aiAgent } = ConfigManager.getInstance().getSettings();
	const commandId = AGENT_CHAT_COMMANDS[aiAgent];

	if (commandId) {
		await commands.executeCommand(commandId);
	} else {
		// 无对应 chat 命令的 agent：复制选中文本到剪贴板，由用户粘贴到 chat
		await commands.executeCommand("editor.action.clipboardCopyAction");
	}
};

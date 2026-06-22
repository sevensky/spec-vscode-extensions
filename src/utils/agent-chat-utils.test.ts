import { beforeEach, describe, expect, it, vi } from "vitest";
import { commands, Position, Selection, Uri, window, workspace } from "vscode";
import { addDocumentToAgentChat } from "./agent-chat-utils";
import { ConfigManager } from "./config-manager";

vi.mock("./config-manager", () => ({
	ConfigManager: {
		getInstance: vi.fn(() => ({
			getSettings: vi.fn(() => ({ aiAgent: "github-copilot" })),
		})),
	},
}));

describe("agent-chat-utils", () => {
	const mockUri = Uri.parse("file:///fake/document.txt");
	const mockDocument = {
		uri: mockUri,
		lineCount: 10,
		lineAt: vi.fn(() => ({ range: { end: new Position(0, 0) } })),
	};
	const mockEditor = {
		document: mockDocument,
		selection: new Selection(new Position(0, 0), new Position(0, 0)),
		revealRange: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		window.activeTextEditor = undefined;
		window.visibleTextEditors = [];
		vi.mocked(window.showTextDocument).mockResolvedValue(mockEditor as any);
		vi.mocked(workspace.openTextDocument).mockResolvedValue(
			mockDocument as any
		);
	});

	// 1. Happy Path: github-copilot uses chatgpt.addToThread
	it("should select the document and execute chatgpt.addToThread for github-copilot", async () => {
		vi.mocked(ConfigManager.getInstance).mockReturnValue({
			getSettings: vi.fn(() => ({ aiAgent: "github-copilot" })),
		} as any);
		// @ts-expect-error
		window.activeTextEditor = mockEditor;
		await addDocumentToAgentChat(mockUri);
		expect(commands.executeCommand).toHaveBeenCalledWith("chatgpt.addToThread");
	});

	// 2. codex also uses chatgpt.addToThread
	it("should execute chatgpt.addToThread for codex", async () => {
		vi.mocked(ConfigManager.getInstance).mockReturnValue({
			getSettings: vi.fn(() => ({ aiAgent: "codex" })),
		} as any);
		// @ts-expect-error
		window.activeTextEditor = mockEditor;
		await addDocumentToAgentChat(mockUri);
		expect(commands.executeCommand).toHaveBeenCalledWith("chatgpt.addToThread");
	});

	// 3. claude has no chat command, falls back to clipboard
	it("should copy to clipboard for claude (no chat command)", async () => {
		vi.mocked(ConfigManager.getInstance).mockReturnValue({
			getSettings: vi.fn(() => ({ aiAgent: "claude" })),
		} as any);
		// @ts-expect-error
		window.activeTextEditor = mockEditor;
		await addDocumentToAgentChat(mockUri);
		expect(commands.executeCommand).toHaveBeenCalledWith(
			"editor.action.clipboardCopyAction"
		);
		expect(commands.executeCommand).not.toHaveBeenCalledWith(
			"chatgpt.addToThread"
		);
	});

	// 4. trae has no chat command, falls back to clipboard
	it("should copy to clipboard for trae (no chat command)", async () => {
		vi.mocked(ConfigManager.getInstance).mockReturnValue({
			getSettings: vi.fn(() => ({ aiAgent: "trae" })),
		} as any);
		// @ts-expect-error
		window.activeTextEditor = mockEditor;
		await addDocumentToAgentChat(mockUri);
		expect(commands.executeCommand).toHaveBeenCalledWith(
			"editor.action.clipboardCopyAction"
		);
	});

	// 5. Edge Case: switch to visible but inactive editor
	it("should switch to the correct editor if it is visible but not active", async () => {
		vi.mocked(ConfigManager.getInstance).mockReturnValue({
			getSettings: vi.fn(() => ({ aiAgent: "github-copilot" })),
		} as any);
		const otherEditor = {
			...mockEditor,
			document: { ...mockDocument, uri: Uri.parse("file:///other.txt") },
		};
		window.activeTextEditor = otherEditor as any;
		window.visibleTextEditors = [mockEditor] as any;

		await addDocumentToAgentChat(mockUri);

		expect(window.showTextDocument).toHaveBeenCalledWith(
			mockDocument,
			expect.any(Object)
		);
		expect(commands.executeCommand).toHaveBeenCalledWith("chatgpt.addToThread");
	});

	// 6. Fail Safe: open document if not visible
	it("should open the document if it is not already visible", async () => {
		vi.mocked(ConfigManager.getInstance).mockReturnValue({
			getSettings: vi.fn(() => ({ aiAgent: "github-copilot" })),
		} as any);
		await addDocumentToAgentChat(mockUri);

		expect(workspace.openTextDocument).toHaveBeenCalledWith(mockUri);
		expect(window.showTextDocument).toHaveBeenCalledWith(
			mockDocument,
			expect.any(Object)
		);
		expect(commands.executeCommand).toHaveBeenCalledWith("chatgpt.addToThread");
	});
});

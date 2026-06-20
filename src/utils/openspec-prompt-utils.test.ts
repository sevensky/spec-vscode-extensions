import { describe, expect, it, vi, beforeEach } from "vitest";
import { Uri, window, workspace } from "vscode";
import {
	createDeprecationWarning,
	createMigrationError,
	readPromptFile,
} from "./openspec-prompt-utils";
import type { AiAgent } from "./config-manager";
import type { CommandId } from "./agent-command-paths";

describe("openspec-prompt-utils", () => {
	const workspaceUri = Uri.file("/fake/workspace");
	const agent: AiAgent = "github-copilot";
	const commandId: CommandId = "propose";
	const v1File = "opsx-propose.prompt.md";
	const legacyFile = "openspec-proposal.prompt.md";
	const createNotFoundError = () =>
		Object.assign(new Error("missing"), {
			code: "FileNotFound",
			name: "FileNotFound",
		});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(workspace.openTextDocument).mockResolvedValue(
			{} as unknown as import("vscode").TextDocument
		);
		vi.mocked(window.showTextDocument).mockResolvedValue(
			{} as unknown as import("vscode").TextEditor
		);
	});

	it("returns v1 prompt content when v1 file exists", async () => {
		const v1Path = Uri.joinPath(workspaceUri, ".github", "prompts", v1File);
		vi.mocked(workspace.fs.readFile).mockImplementation((uri) => {
			if (uri.fsPath === v1Path.fsPath) {
				return Promise.resolve(new TextEncoder().encode("V1 content"));
			}
			return Promise.reject(createNotFoundError());
		});

		const result = await readPromptFile(workspaceUri, agent, commandId);

		expect(result).toEqual({
			content: "V1 content",
			isLegacy: false,
			filePath: v1Path.fsPath,
		});
		expect(window.showWarningMessage).not.toHaveBeenCalled();
	});

	it("falls back to legacy prompt and shows a warning (github-copilot only)", async () => {
		const legacyPath = Uri.joinPath(
			workspaceUri,
			".github",
			"prompts",
			legacyFile
		);

		vi.mocked(workspace.fs.readFile).mockImplementation((uri) => {
			if (uri.fsPath === legacyPath.fsPath) {
				return Promise.resolve(new TextEncoder().encode("Legacy content"));
			}
			return Promise.reject(createNotFoundError());
		});
		vi.mocked(window.showWarningMessage).mockResolvedValue(
			"Learn More" as unknown as import("vscode").MessageItem
		);

		const result = await readPromptFile(workspaceUri, agent, commandId);

		expect(result).toEqual({
			content: "Legacy content",
			isLegacy: true,
			filePath: legacyPath.fsPath,
		});
		expect(window.showWarningMessage).toHaveBeenCalledWith(
			createDeprecationWarning(legacyFile, v1File),
			"Learn More"
		);
		expect(workspace.openTextDocument).toHaveBeenCalled();
		const [openArg] = vi.mocked(workspace.openTextDocument).mock.calls[0] ?? [];
		expect(openArg).toMatchObject({
			fsPath: Uri.joinPath(workspaceUri, "README.md").fsPath,
		});
		expect(window.showTextDocument).toHaveBeenCalled();
	});

	it("throws a migration error when neither prompt exists", async () => {
		vi.mocked(workspace.fs.readFile).mockRejectedValue(createNotFoundError());

		await expect(
			readPromptFile(workspaceUri, agent, commandId)
		).rejects.toThrow(createMigrationError(agent, commandId, workspaceUri.fsPath));
	});

	it("rethrows unexpected read errors", async () => {
		const unexpectedError = new Error("permission denied");
		vi.mocked(workspace.fs.readFile).mockRejectedValue(unexpectedError);

		await expect(
			readPromptFile(workspaceUri, agent, commandId)
		).rejects.toThrow("permission denied");
	});

	it("creates migration and deprecation messages with filenames", () => {
		const migration = createMigrationError(agent, commandId, "/work");
		expect(migration).toContain("OpenSpec v1 prompt files not found");
		expect(migration).toContain(`Required: .github/prompts/${v1File}`);
		expect(migration).toContain("npm install -g openspec@latest");
		expect(migration).toContain("delivery");
		expect(migration).toContain("github-copilot");

		const deprecation = createDeprecationWarning(legacyFile, v1File);
		expect(deprecation).toContain(legacyFile);
		expect(deprecation).toContain(v1File);
	});

	// ── Multi-agent path tests ──

	it("reads claude command from .claude/commands/opsx/", async () => {
		const claudeAgent: AiAgent = "claude";
		const expectedPath = Uri.joinPath(
			workspaceUri,
			".claude",
			"commands",
			"opsx",
			"propose.md"
		);
		vi.mocked(workspace.fs.readFile).mockImplementation((uri) => {
			if (uri.fsPath === expectedPath.fsPath) {
				return Promise.resolve(new TextEncoder().encode("Claude content"));
			}
			return Promise.reject(createNotFoundError());
		});

		const result = await readPromptFile(workspaceUri, claudeAgent, "propose");

		expect(result.content).toBe("Claude content");
		expect(result.isLegacy).toBe(false);
		expect(result.filePath).toBe(expectedPath.fsPath);
	});

	it("reads trae command from .trae/commands/opsx/", async () => {
		const traeAgent: AiAgent = "trae";
		const expectedPath = Uri.joinPath(
			workspaceUri,
			".trae",
			"commands",
			"opsx",
			"apply.md"
		);
		vi.mocked(workspace.fs.readFile).mockImplementation((uri) => {
			if (uri.fsPath === expectedPath.fsPath) {
				return Promise.resolve(new TextEncoder().encode("Trae content"));
			}
			return Promise.reject(createNotFoundError());
		});

		const result = await readPromptFile(workspaceUri, traeAgent, "apply");

		expect(result.content).toBe("Trae content");
		expect(result.isLegacy).toBe(false);
		expect(result.filePath).toBe(expectedPath.fsPath);
	});

	it("reads codebuddy command from .codebuddy/commands/opsx/", async () => {
		const codebuddyAgent: AiAgent = "codebuddy";
		const expectedPath = Uri.joinPath(
			workspaceUri,
			".codebuddy",
			"commands",
			"opsx",
			"archive.md"
		);
		vi.mocked(workspace.fs.readFile).mockImplementation((uri) => {
			if (uri.fsPath === expectedPath.fsPath) {
				return Promise.resolve(new TextEncoder().encode("CodeBuddy content"));
			}
			return Promise.reject(createNotFoundError());
		});

		const result = await readPromptFile(workspaceUri, codebuddyAgent, "archive");

		expect(result.content).toBe("CodeBuddy content");
		expect(result.isLegacy).toBe(false);
		expect(result.filePath).toBe(expectedPath.fsPath);
	});

	it("does not attempt legacy fallback for non-github-copilot agents", async () => {
		const claudeAgent: AiAgent = "claude";
		vi.mocked(workspace.fs.readFile).mockRejectedValue(createNotFoundError());

		await expect(
			readPromptFile(workspaceUri, claudeAgent, "propose")
		).rejects.toThrow();

		// Should not show deprecation warning since claude has no legacy format
		expect(window.showWarningMessage).not.toHaveBeenCalled();
	});

	it("creates migration error with agent-specific path for trae", () => {
		const migration = createMigrationError("trae", "propose", "/work");
		expect(migration).toContain("trae");
		expect(migration).toContain("Required: .trae/commands/opsx/propose.md");
	});

	it("creates migration error with agent-specific path for claude", () => {
		const migration = createMigrationError("claude", "apply", "/work");
		expect(migration).toContain("claude");
		expect(migration).toContain("Required: .claude/commands/opsx/apply.md");
	});
});

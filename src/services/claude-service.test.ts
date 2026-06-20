import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileType, window, workspace } from "vscode";

vi.mock("os", () => ({
	homedir: () => "/home/test",
}));

vi.mock("crypto", () => ({
	randomUUID: () => "uuid-test",
}));

// mock child_process：默认 claude 已安装（execFileSync 返回版本号）
const execFileSyncMock = vi.fn(() => Buffer.from("claude 1.0.0"));
vi.mock("child_process", () => ({
	execFileSync: execFileSyncMock,
}));

describe("ClaudeService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// 默认 claude 已安装（execFileSync 不抛异常）
		execFileSyncMock.mockReturnValue(Buffer.from("1.0.0"));
	});

	it("writes a temp file, creates terminal and sends claude command", async () => {
		const { ClaudeService } = await import("./claude-service");

		vi.mocked(workspace.fs.readDirectory).mockResolvedValue([] as any);
		const mockTerminal = { show: vi.fn(), sendText: vi.fn() };
		vi.mocked(window.createTerminal).mockReturnValue(mockTerminal as any);

		await ClaudeService.addPromptToThread("hello");

		expect(workspace.fs.writeFile).toHaveBeenCalled();
		expect(window.createTerminal).toHaveBeenCalled();
		expect(mockTerminal.show).toHaveBeenCalled();
		expect(mockTerminal.sendText).toHaveBeenCalledWith(
			expect.stringContaining("claude"),
			true,
		);
		// 命令应含 $(cat ...) 引用临时文件
		expect(mockTerminal.sendText).toHaveBeenCalledWith(
			expect.stringContaining("$(cat"),
			true,
		);
	});

	it("shows error and returns early when claude CLI is not installed", async () => {
		const { ClaudeService } = await import("./claude-service");

		// claude 未安装（execFileSync 抛异常）
		execFileSyncMock.mockImplementation(() => {
			throw new Error("not found");
		});

		await ClaudeService.addPromptToThread("hello");

		expect(window.showErrorMessage).toHaveBeenCalled();
		expect(window.createTerminal).not.toHaveBeenCalled();
	});

	it("deletes .md files older than 7 days (best-effort)", async () => {
		const { ClaudeService } = await import("./claude-service");
		const now = Date.now();
		const eightDaysMs = 8 * 24 * 60 * 60 * 1000;

		vi.mocked(workspace.fs.readDirectory).mockResolvedValue([
			["old.md", FileType.File],
		] as any);
		vi.mocked(workspace.fs.stat).mockResolvedValue({
			mtime: now - eightDaysMs,
		} as any);
		vi.mocked(window.createTerminal).mockReturnValue({
			show: vi.fn(),
			sendText: vi.fn(),
		} as any);

		await ClaudeService.addPromptToThread("hello");

		expect(workspace.fs.delete).toHaveBeenCalled();
	});

	it("does not delete recent .md files", async () => {
		const { ClaudeService } = await import("./claude-service");
		const now = Date.now();
		const oneDayMs = 1 * 24 * 60 * 60 * 1000;

		vi.mocked(workspace.fs.readDirectory).mockResolvedValue([
			["recent.md", FileType.File],
		] as any);
		vi.mocked(workspace.fs.stat).mockResolvedValue({
			mtime: now - oneDayMs,
		} as any);
		vi.mocked(window.createTerminal).mockReturnValue({
			show: vi.fn(),
			sendText: vi.fn(),
		} as any);

		await ClaudeService.addPromptToThread("hello");

		expect(workspace.fs.delete).not.toHaveBeenCalled();
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { workspace } from "vscode";
import { SpecContextManager } from "./spec-context-manager";
import { DEFAULT_SPEC_CONTEXT } from "../../types/spec-context.types";

vi.mock("vscode");

describe("SpecContextManager", () => {
	const changeName = "test-change";

	beforeEach(() => {
		vi.clearAllMocks();
		// 确保每个 case 都有有效的 workspaceFolders（某些 case 会临时置空）
		workspace.workspaceFolders = [
			{
				uri: {
					fsPath: "/fake/workspace",
					with: vi.fn(),
					toString: () => "file:///fake/workspace",
				},
			},
		];
	});

	describe("getContextPath", () => {
		it("should return path under openspec/changes/<name>/.spec-context.json", () => {
			const uri = SpecContextManager.getContextPath(changeName);
			expect(uri).toBeDefined();
			expect(uri?.fsPath).toContain("openspec");
			expect(uri?.fsPath).toContain("changes");
			expect(uri?.fsPath).toContain(changeName);
			expect(uri?.fsPath).toContain(".spec-context.json");
		});

		it("should return undefined when no workspace folder", () => {
			const original = workspace.workspaceFolders;
			workspace.workspaceFolders = undefined;
			const uri = SpecContextManager.getContextPath(changeName);
			expect(uri).toBeUndefined();
			workspace.workspaceFolders = original;
		});
	});

	describe("read", () => {
		it("should return default context when file does not exist", async () => {
			vi.mocked(workspace.fs.readFile).mockRejectedValue(
				new Error("not found")
			);
			const ctx = await SpecContextManager.read(changeName);
			expect(ctx).toEqual(DEFAULT_SPEC_CONTEXT);
		});

		it("should parse existing context", async () => {
			const existing = {
				step: "design",
				status: "active",
				history: [
					{
						step: "propose",
						status: "completed",
						at: "2026-01-01T00:00:00Z",
						agent: "claude",
					},
				],
				agent: "claude",
			};
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(JSON.stringify(existing), "utf-8")
			);
			const ctx = await SpecContextManager.read(changeName);
			expect(ctx.step).toBe("design");
			expect(ctx.history).toHaveLength(1);
			expect(ctx.agent).toBe("claude");
		});

		it("should fall back to defaults for missing fields", async () => {
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(JSON.stringify({ step: "tasks" }), "utf-8")
			);
			const ctx = await SpecContextManager.read(changeName);
			expect(ctx.step).toBe("tasks");
			expect(ctx.status).toBe(DEFAULT_SPEC_CONTEXT.status);
			expect(ctx.history).toEqual([]);
		});

		it("should return default when no workspace folder", async () => {
			const original = workspace.workspaceFolders;
			workspace.workspaceFolders = undefined;
			const ctx = await SpecContextManager.read(changeName);
			expect(ctx).toEqual(DEFAULT_SPEC_CONTEXT);
			workspace.workspaceFolders = original;
		});
	});

	describe("write", () => {
		it("should create parent directory and write JSON", async () => {
			await SpecContextManager.write(changeName, DEFAULT_SPEC_CONTEXT);
			expect(workspace.fs.createDirectory).toHaveBeenCalled();
			expect(workspace.fs.writeFile).toHaveBeenCalled();
			const writtenArg = vi.mocked(workspace.fs.writeFile).mock
				.calls[0][1] as Buffer;
			const parsed = JSON.parse(writtenArg.toString("utf-8"));
			expect(parsed.step).toBe(DEFAULT_SPEC_CONTEXT.step);
		});
	});

	describe("markStarted", () => {
		it("should update step/status and append started history", async () => {
			vi.mocked(workspace.fs.readFile).mockRejectedValue(
				new Error("not found")
			);
			const ctx = await SpecContextManager.markStarted(
				changeName,
				"design",
				"claude"
			);
			expect(ctx.step).toBe("design");
			expect(ctx.status).toBe("active");
			expect(ctx.agent).toBe("claude");
			expect(ctx.history).toHaveLength(1);
			expect(ctx.history[0].status).toBe("started");
			expect(ctx.history[0].agent).toBe("claude");
		});
	});

	describe("appendCompleted", () => {
		it("should append completed entry without changing step", async () => {
			const existing = {
				step: "tasks",
				status: "active",
				history: [],
				agent: "cbc",
			};
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(JSON.stringify(existing), "utf-8")
			);
			const ctx = await SpecContextManager.appendCompleted(
				changeName,
				"design",
				"cbc"
			);
			expect(ctx.step).toBe("tasks"); // unchanged
			expect(ctx.history).toHaveLength(1);
			expect(ctx.history[0].status).toBe("completed");
		});
	});

	describe("setStatus", () => {
		it("should update status only", async () => {
			const existing = { ...DEFAULT_SPEC_CONTEXT, status: "active" as const };
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(JSON.stringify(existing), "utf-8")
			);
			const ctx = await SpecContextManager.setStatus(changeName, "completed");
			expect(ctx.status).toBe("completed");
			expect(ctx.step).toBe(DEFAULT_SPEC_CONTEXT.step); // unchanged
		});
	});

	describe("history accumulation across calls", () => {
		it("markStarted should append to existing history", async () => {
			// 模拟已有 1 条历史记录的 context
			const existing = {
				step: "propose",
				status: "active" as const,
				history: [
					{
						step: "propose",
						status: "completed" as const,
						at: "2026-01-01T00:00:00Z",
						agent: "claude",
					},
				],
				agent: "claude",
			};
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(JSON.stringify(existing), "utf-8")
			);
			const ctx = await SpecContextManager.markStarted(
				changeName,
				"design",
				"cbc"
			);
			expect(ctx.history).toHaveLength(2); // 原 1 条 + 新 1 条
			expect(ctx.history[1].step).toBe("design");
			expect(ctx.agent).toBe("cbc"); // 更新为最新 agent
		});
	});
});

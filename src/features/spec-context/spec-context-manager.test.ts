import { beforeEach, describe, expect, it, vi } from "vitest";
import { workspace } from "vscode";
import { SpecContextManager } from "./spec-context-manager";
import {
	DEFAULT_SPEC_CONTEXT,
	type ReviewComment,
} from "../../types/spec-context.types";

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
			expect(ctx.status).toBe("draft"); // 无 history → draft（派生）
			expect(ctx.history).toEqual([]);
		});

		it("should normalize legacy active status via history derivation", async () => {
			// 旧数据 status:'active' 应被忽略，由 history 派生
			const legacy = {
				step: "design",
				status: "active",
				history: [
					{ step: "design", status: "started", at: "2026-01-01T00:00:00Z", agent: "claude" },
				],
				agent: "claude",
			};
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(JSON.stringify(legacy), "utf-8")
			);
			const ctx = await SpecContextManager.read(changeName);
			expect(ctx.status).toBe("designing"); // 派生，非 active
			expect(ctx.terminalStatus).toBeUndefined();
		});

		it("should migrate legacy completed/archived to terminalStatus", async () => {
			const legacy = {
				step: "tasks",
				status: "completed",
				history: [],
				agent: "claude",
			};
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(JSON.stringify(legacy), "utf-8")
			);
			const ctx = await SpecContextManager.read(changeName);
			expect(ctx.terminalStatus).toBe("completed");
			expect(ctx.status).toBe("completed"); // 派生自 terminalStatus
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
		it("should update step and derive in-progress status from history", async () => {
			vi.mocked(workspace.fs.readFile).mockRejectedValue(
				new Error("not found")
			);
			const ctx = await SpecContextManager.markStarted(
				changeName,
				"design",
				"claude"
			);
			expect(ctx.step).toBe("design");
			expect(ctx.status).toBe("designing"); // 派生进行态，非 active
			expect(ctx.agent).toBe("claude");
			expect(ctx.history).toHaveLength(1);
			expect(ctx.history[0].status).toBe("started");
			expect(ctx.history[0].agent).toBe("claude");
		});

		it("should clear terminalStatus when reactivating from completed", async () => {
			// 已 completed 的变更，重新 markStarted 应清除终态
			const existing = {
				step: "design",
				status: "completed",
				terminalStatus: "completed",
				history: [
					{ step: "design", status: "completed", at: "2026-01-01T00:00:00Z", agent: "claude" },
				],
				agent: "claude",
			};
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(JSON.stringify(existing), "utf-8")
			);
			const ctx = await SpecContextManager.markStarted(
				changeName,
				"design",
				"claude"
			);
			expect(ctx.terminalStatus).toBeUndefined();
			expect(ctx.status).toBe("designing"); // 重新进行中
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
		it("should set terminal status completed", async () => {
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(JSON.stringify({ ...DEFAULT_SPEC_CONTEXT }), "utf-8")
			);
			const ctx = await SpecContextManager.setStatus(changeName, "completed");
			expect(ctx.terminalStatus).toBe("completed");
			expect(ctx.status).toBe("completed"); // 派生自 terminalStatus
			expect(ctx.step).toBe(DEFAULT_SPEC_CONTEXT.step); // unchanged
		});

		it("should set terminal status archived", async () => {
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(JSON.stringify({ ...DEFAULT_SPEC_CONTEXT }), "utf-8")
			);
			const ctx = await SpecContextManager.setStatus(changeName, "archived");
			expect(ctx.terminalStatus).toBe("archived");
			expect(ctx.status).toBe("archived");
		});

		it("should accept 'active' as reactivate (clear terminalStatus)", async () => {
			const existing = {
				...DEFAULT_SPEC_CONTEXT,
				terminalStatus: "completed" as const,
				history: [
					{ step: "design", status: "started", at: "2026-01-01T00:00:00Z", agent: "claude" },
				],
			};
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(JSON.stringify(existing), "utf-8")
			);
			const ctx = await SpecContextManager.setStatus(changeName, "active");
			expect(ctx.terminalStatus).toBeUndefined();
			expect(ctx.status).toBe("designing"); // 由 history 重新派生
		});

		it("should reject in-progress status like 'designing'", async () => {
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(JSON.stringify({ ...DEFAULT_SPEC_CONTEXT }), "utf-8")
			);
			await expect(
				SpecContextManager.setStatus(changeName, "designing")
			).rejects.toThrow(/仅接受终态/);
		});
	});

	describe("deriveStatus (pure)", () => {
		it("should return draft for empty history", () => {
			expect(SpecContextManager.deriveStatus([])).toBe("draft");
		});

		it("should return in-progress status when last entry is started", () => {
			const history = [
				{ step: "design", status: "started", at: "2026-01-01T00:00:00Z", agent: "claude" },
			];
			expect(SpecContextManager.deriveStatus(history)).toBe("designing");
		});

		it("should return completed status when last entry is completed", () => {
			const history = [
				{ step: "tasks", status: "completed", at: "2026-01-01T00:00:00Z", agent: "claude" },
			];
			expect(SpecContextManager.deriveStatus(history)).toBe("tasked");
		});

		it("should prioritize terminalStatus over history", () => {
			const history = [
				{ step: "design", status: "started", at: "2026-01-01T00:00:00Z", agent: "claude" },
			];
			expect(SpecContextManager.deriveStatus(history, "archived")).toBe("archived");
		});

		it("should derive from last entry only", () => {
			const history = [
				{ step: "propose", status: "completed", at: "2026-01-01T00:00:00Z", agent: "claude" },
				{ step: "design", status: "started", at: "2026-01-02T00:00:00Z", agent: "cbc" },
				{ step: "design", status: "completed", at: "2026-01-03T00:00:00Z", agent: "cbc" },
				{ step: "specs", status: "started", at: "2026-01-04T00:00:00Z", agent: "cbc" },
			];
			expect(SpecContextManager.deriveStatus(history)).toBe("specifying");
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

	describe("reviewComments 评论读写", () => {
		const makeComment = (id: string, doc = "tasks"): ReviewComment => ({
			id,
			doc,
			anchor: { heading: null, blockText: "原文", line: 1 },
			comment: `评论-${id}`,
			status: "pending",
			createdAt: "2026-06-23T00:00:00Z",
		});

		it("read 兼容无 reviewComments 的旧文件（默认空数组）", async () => {
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(
					JSON.stringify({ step: "propose", status: "draft", history: [] }),
					"utf-8"
				)
			);
			const ctx = await SpecContextManager.read(changeName);
			expect(ctx.reviewComments).toEqual([]);
		});

		it("addComment 追加评论并持久化", async () => {
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(JSON.stringify(DEFAULT_SPEC_CONTEXT), "utf-8")
			);
			const ctx = await SpecContextManager.addComment(
				changeName,
				makeComment("c1")
			);
			expect(ctx.reviewComments).toHaveLength(1);
			expect(ctx.reviewComments?.[0].id).toBe("c1");
			// write 被调用
			expect(workspace.fs.writeFile).toHaveBeenCalled();
		});

		it("removeComment 按 id 移除", async () => {
			const existing = {
				...DEFAULT_SPEC_CONTEXT,
				reviewComments: [makeComment("c1"), makeComment("c2")],
			};
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(JSON.stringify(existing), "utf-8")
			);
			const ctx = await SpecContextManager.removeComment(changeName, "c1");
			expect(ctx.reviewComments).toHaveLength(1);
			expect(ctx.reviewComments?.[0].id).toBe("c2");
		});

		it("markCommentsApplied 将指定 doc 的 pending 标记 applied", async () => {
			const existing = {
				...DEFAULT_SPEC_CONTEXT,
				reviewComments: [
					makeComment("c1", "tasks"),
					makeComment("c2", "proposal"),
					{ ...makeComment("c3", "tasks"), status: "applied" as const },
				],
			};
			vi.mocked(workspace.fs.readFile).mockResolvedValue(
				Buffer.from(JSON.stringify(existing), "utf-8")
			);
			const ctx = await SpecContextManager.markCommentsApplied(
				changeName,
				"tasks"
			);
			const tasks = ctx.reviewComments?.filter((c) => c.doc === "tasks");
			expect(tasks?.every((c) => c.status === "applied")).toBe(true);
			// proposal 的评论不受影响
			const proposal = ctx.reviewComments?.find((c) => c.doc === "proposal");
			expect(proposal?.status).toBe("pending");
		});

		it("评论操作串行（队列防并发覆盖）", async () => {
			// 用闭包模拟磁盘状态：read 返回上次 write 的结果，验证累积
			let disk: SpecContext = { ...DEFAULT_SPEC_CONTEXT };
			vi.mocked(workspace.fs.readFile).mockImplementation(async () =>
				Buffer.from(JSON.stringify(disk), "utf-8")
			);
			vi.mocked(workspace.fs.writeFile).mockImplementation(async (uri, buf) => {
				disk = JSON.parse(buf.toString("utf-8"));
			});
			// 并发发起 3 个 addComment
			await Promise.all([
				SpecContextManager.addComment(changeName, makeComment("a")),
				SpecContextManager.addComment(changeName, makeComment("b")),
				SpecContextManager.addComment(changeName, makeComment("c")),
			]);
			// 串行队列应保证 3 条都累积写入（非覆盖）
			expect(disk.reviewComments).toHaveLength(3);
		});
	});
});

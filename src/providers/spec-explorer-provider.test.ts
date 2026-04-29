import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtensionContext } from "vscode";
import { Uri, workspace } from "vscode";
import { SpecExplorerProvider } from "./spec-explorer-provider";
import type { SpecManager } from "../features/spec/spec-manager";

describe("SpecExplorerProvider", () => {
	let provider: SpecExplorerProvider;
	const context = {
		extensionUri: Uri.file("/fake/extension"),
	} as ExtensionContext;
	let specManager: SpecManager;

	beforeEach(() => {
		vi.clearAllMocks();
		specManager = {
			getSpecs: vi.fn().mockResolvedValue([]),
			getChanges: vi.fn().mockResolvedValue([]),
			getChangeSpecs: vi.fn().mockResolvedValue([]),
		} as unknown as SpecManager;

		provider = new SpecExplorerProvider(context);
		provider.setSpecManager(specManager);

		// Mock workspace folders
		(workspace as any).workspaceFolders = [
			{ uri: Uri.file("/fake/workspace") },
		];

		vi.mocked(workspace.fs.readFile).mockResolvedValue(new Uint8Array());
	});

	const getChangeItem = async (changeName: string) => {
		vi.mocked(specManager.getChanges).mockResolvedValue([changeName]);
		const rootItems = await provider.getChildren();
		const changesGroup = rootItems.find(
			(item) => item.contextValue === "group-changes"
		);
		const changes = await provider.getChildren(changesGroup);
		return changes[0];
	};

	const getIconPath = (item: any): string => {
		if (item.iconPath?.id) {
			return item.iconPath.id;
		}

		if (item.iconPath?.light?.fsPath) {
			return item.iconPath.light.fsPath;
		}

		if (item.iconPath?.fsPath) {
			return item.iconPath.fsPath;
		}

		return "";
	};

	it("hides missing change files", async () => {
		const changeName = "test-change";
		vi.mocked(specManager.getChanges).mockResolvedValue([changeName]);

		// Mock fs.stat to throw for missing files
		vi.mocked(workspace.fs.stat).mockImplementation((uri) => {
			const fsPath = uri.fsPath;
			if (fsPath.endsWith("proposal.md")) {
				return Promise.resolve({} as any); // Exists
			}
			if (fsPath.endsWith("tasks.md")) {
				return Promise.reject(new Error("File not found")); // Missing
			}
			if (fsPath.endsWith("design.md")) {
				return Promise.resolve({} as any); // Exists
			}
			if (fsPath.endsWith("detailed-design.md")) {
				return Promise.resolve({} as any); // Exists
			}
			return Promise.resolve({} as any);
		});

		// Get root items
		const rootItems = await provider.getChildren();
		const changesGroup = rootItems.find(
			(item) => item.contextValue === "group-changes"
		);
		expect(changesGroup).toBeDefined();

		// Get changes
		const changes = await provider.getChildren(changesGroup);
		expect(changes).toHaveLength(1);
		const changeItem = changes[0];
		expect(changeItem.label).toBe(changeName);

		// Get change details
		const changeDetails = await provider.getChildren(changeItem);

		// Verify items
		const labels = changeDetails.map((item) => item.label);
		expect(labels).toContain("Proposal");
		expect(labels).not.toContain("Tasks");
		expect(labels).toContain("Design");
		expect(labels).toContain("Detailed Design");
		expect(labels).toContain("Specs");
	});

	it("shows missing status when tasks.md does not exist", async () => {
		vi.mocked(workspace.fs.stat).mockImplementation((uri) => {
			const fsPath = uri.fsPath;
			if (fsPath.endsWith("tasks.md")) {
				return Promise.reject(new Error("File not found"));
			}
			return Promise.resolve({} as any);
		});

		const changeItem = await getChangeItem("missing-tasks");

		expect(getIconPath(changeItem)).toBe("warning");
		expect(changeItem.description).toBeUndefined();
		expect(changeItem.tooltip).toBe("No tasks.md found");
	});

	it("shows empty status when tasks.md has no checkbox tasks", async () => {
		vi.mocked(workspace.fs.stat).mockResolvedValue({} as any);
		vi.mocked(workspace.fs.readFile).mockResolvedValue(
			new TextEncoder().encode("# Tasks\n\nNo checkboxes here")
		);

		const changeItem = await getChangeItem("empty-tasks");

		expect(getIconPath(changeItem)).toBe("circle-outline");
		expect(changeItem.description).toBeUndefined();
		expect(changeItem.tooltip).toBe("tasks.md contains no recognized tasks");
	});

	it("shows partial status with floored percentage", async () => {
		vi.mocked(workspace.fs.stat).mockResolvedValue({} as any);
		vi.mocked(workspace.fs.readFile).mockResolvedValue(
			new TextEncoder().encode("- [x] done one\n- [ ] todo one\n- [ ] todo two")
		);

		const changeItem = await getChangeItem("partial-tasks");

		expect(getIconPath(changeItem)).toContain("progress-30.svg");
		expect(changeItem.description).toBe("33%");
		expect(changeItem.tooltip).toBe("1 of 3 tasks complete (33%)");
	});

	it("shows not-started progress as 0%", async () => {
		vi.mocked(workspace.fs.stat).mockResolvedValue({} as any);
		vi.mocked(workspace.fs.readFile).mockResolvedValue(
			new TextEncoder().encode("- [ ] first\n- [ ] second")
		);

		const changeItem = await getChangeItem("not-started-tasks");

		expect(getIconPath(changeItem)).toContain("progress-0.svg");
		expect(changeItem.description).toBe("0%");
		expect(changeItem.tooltip).toBe("0 of 2 tasks complete (0%)");
	});

	it("shows complete status at 100%", async () => {
		vi.mocked(workspace.fs.stat).mockResolvedValue({} as any);
		vi.mocked(workspace.fs.readFile).mockResolvedValue(
			new TextEncoder().encode("- [x] first\n- [x] second")
		);

		const changeItem = await getChangeItem("complete-tasks");

		expect(getIconPath(changeItem)).toBe("pass-filled");
		expect(changeItem.description).toBe("100%");
		expect(changeItem.tooltip).toBe("All tasks complete");
	});

	it("parses checkbox tasks with leading whitespace", async () => {
		vi.mocked(workspace.fs.stat).mockResolvedValue({} as any);
		vi.mocked(workspace.fs.readFile).mockResolvedValue(
			new TextEncoder().encode("  - [x] done\n    - [ ] todo")
		);

		const changeItem = await getChangeItem("indented-tasks");

		expect(getIconPath(changeItem)).toContain("progress-50.svg");
		expect(changeItem.description).toBe("50%");
		expect(changeItem.tooltip).toBe("1 of 2 tasks complete (50%)");
	});

	it("treats uppercase X as incomplete for completion count", async () => {
		vi.mocked(workspace.fs.stat).mockResolvedValue({} as any);
		vi.mocked(workspace.fs.readFile).mockResolvedValue(
			new TextEncoder().encode("- [X] maybe done\n- [ ] todo")
		);

		const changeItem = await getChangeItem("uppercase-tasks");

		expect(getIconPath(changeItem)).toContain("progress-0.svg");
		expect(changeItem.description).toBe("0%");
		expect(changeItem.tooltip).toBe("0 of 1 tasks complete (0%)");
	});

	it("parses mixed tasks and non-task lines", async () => {
		vi.mocked(workspace.fs.stat).mockResolvedValue({} as any);
		vi.mocked(workspace.fs.readFile).mockResolvedValue(
			new TextEncoder().encode(
				"# Heading\n- [x] done\n- note\n- [ ] todo\nplain text"
			)
		);

		const changeItem = await getChangeItem("mixed-lines");

		expect(getIconPath(changeItem)).toContain("progress-50.svg");
		expect(changeItem.description).toBe("50%");
		expect(changeItem.tooltip).toBe("1 of 2 tasks complete (50%)");
	});

	it("maps 72% progress to the 70 bucket icon", async () => {
		vi.mocked(workspace.fs.stat).mockResolvedValue({} as any);
		vi.mocked(workspace.fs.readFile).mockResolvedValue(
			new TextEncoder().encode(
				"- [x] one\n- [x] two\n- [x] three\n- [x] four\n- [x] five\n- [x] six\n- [x] seven\n- [ ] eight\n- [ ] nine\n- [ ] ten"
			)
		);

		const changeItem = await getChangeItem("seventy-two-percent");

		expect(changeItem.description).toBe("70%");
		expect(getIconPath(changeItem)).toContain("progress-70.svg");
	});
});

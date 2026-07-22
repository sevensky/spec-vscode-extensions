import type { WorkspaceFolder } from "vscode";
import { Uri, workspace } from "vscode";
import type { SpecExplorerProvider } from "../../../providers/spec-explorer-provider";
import { sendPromptToChat } from "../../../utils/chat-prompt-runner";
import { t } from "../../../i18n";
import type { ExtensionServices } from "../../../activation/extension-services";
import type { SpecManager } from "../spec-manager";

const PROMPT_FILENAME = "openspec-review-change.prompt.md";

const readUtf8OrThrow = async (uri: Uri, label: string) => {
	try {
		const data = await workspace.fs.readFile(uri);
		return new TextDecoder().decode(data);
	} catch (error) {
		throw new Error(
			t("error.unreadableFile", {
				label,
				path: uri.fsPath,
				detail: error instanceof Error ? error.message : String(error),
			})
		);
	}
};

const getChangeIdOrThrow = (item: unknown) => {
	const changeId = (item as { specName?: unknown } | null)?.specName;
	if (typeof changeId !== "string" || changeId.length === 0) {
		throw new Error(t("error.determineChangeId"));
	}
	return changeId;
};

const getWorkspaceFolderOrThrow = (): WorkspaceFolder => {
	const ws = workspace.workspaceFolders?.[0];
	if (!ws) {
		throw new Error(t("common.noWorkspace"));
	}
	return ws;
};

/**
 * 确保 workspace 内存在 review prompt 副本（不存在则从扩展资源复制）。
 * 与 create-detailed-design 同模式：用户可自行编辑 workspace 内的副本，扩展不自覆盖。
 */
const ensureReviewPromptTemplate = async (wsUri: Uri, extensionUri: Uri) => {
	const promptsDir = Uri.joinPath(wsUri, ".github", "prompts");
	const promptPath = Uri.joinPath(promptsDir, PROMPT_FILENAME);

	try {
		await workspace.fs.stat(promptPath);
		return promptPath;
	} catch {
		await workspace.fs.createDirectory(promptsDir);
		const templateUri = Uri.joinPath(
			extensionUri,
			"src",
			"resources",
			"prompts",
			PROMPT_FILENAME
		);

		let templateBytes: Uint8Array;
		try {
			templateBytes = await workspace.fs.readFile(templateUri);
		} catch (error) {
			throw new Error(
				t("error.missingPromptTemplate", {
					path: templateUri.fsPath,
					detail: error instanceof Error ? error.message : String(error),
				})
			);
		}

		await workspace.fs.writeFile(promptPath, templateBytes);
		return promptPath;
	}
};

const getRelativePath = (uri: Uri) => workspace.asRelativePath(uri, false);

/** 探测 change 目录下存在哪些工件文件，返回相对路径（不存在返回 null）。 */
const getChangeDocumentPaths = async (changeBase: Uri) => {
	const proposalUri = Uri.joinPath(changeBase, "proposal.md");
	const tasksUri = Uri.joinPath(changeBase, "tasks.md");
	const designUri = Uri.joinPath(changeBase, "design.md");

	const exists = async (uri: Uri) => {
		try {
			await workspace.fs.stat(uri);
			return true;
		} catch {
			return false;
		}
	};

	const [hasProposal, hasTasks, hasDesign] = await Promise.all([
		exists(proposalUri),
		exists(tasksUri),
		exists(designUri),
	]);

	return {
		proposalPath: hasProposal ? getRelativePath(proposalUri) : null,
		tasksPath: hasTasks ? getRelativePath(tasksUri) : null,
		designPath: hasDesign ? getRelativePath(designUri) : null,
	};
};

// 收集 delta specs（openspec/changes/<id>/specs/<name>/spec.md）相对路径。
const getDeltaSpecPaths = async (
	changeBase: Uri,
	specManager: SpecManager,
	changeId: string
) => {
	const specsDir = Uri.joinPath(changeBase, "specs");
	const result: Array<{ name: string; path: string }> = [];

	try {
		const specNames = await specManager.getChangeSpecs(changeId);
		for (const name of specNames) {
			const specUri = Uri.joinPath(specsDir, name, "spec.md");
			try {
				await workspace.fs.stat(specUri);
				result.push({ name, path: getRelativePath(specUri) });
			} catch {
				// spec 目录存在但 spec.md 缺失，跳过
			}
		}
	} catch {
		// specs 目录不存在或读取失败，返回空（review 仍可基于 proposal/tasks 进行）
	}
	return result;
};

const composeReviewPrompt = (args: {
	promptTemplate: string;
	changeId: string;
	proposalPath: string | null;
	tasksPath: string | null;
	designPath: string | null;
	deltaSpecs: Array<{ name: string; path: string }>;
}) => {
	const sections: string[] = [];
	sections.push(args.promptTemplate.trim());
	sections.push(`\n\n---\n\n# Review Target\n\nchange-id: ${args.changeId}`);

	sections.push("\n\nRead these artifacts before reviewing:");
	const docLines: string[] = [];
	if (args.proposalPath) {
		docLines.push(
			`- **proposal.md**: [${args.proposalPath}](${args.proposalPath})`
		);
	}
	if (args.tasksPath) {
		docLines.push(`- **tasks.md**: [${args.tasksPath}](${args.tasksPath})`);
	}
	if (args.designPath) {
		docLines.push(`- **design.md**: [${args.designPath}](${args.designPath})`);
	}
	if (args.deltaSpecs.length > 0) {
		docLines.push("- **delta specs**:");
		for (const s of args.deltaSpecs) {
			docLines.push(`  - [${s.path}](${s.path})`);
		}
	}
	sections.push(
		docLines.length > 0 ? docLines.join("\n") : "- (no artifacts found)"
	);

	sections.push(
		`\n\n---\n\nNow perform the five-perspective review of change \`${args.changeId}\` and output the structured report.`
	);

	return sections.join("\n");
};

export const reviewChangeCommandHandler = (
	services: ExtensionServices,
	_specExplorer: SpecExplorerProvider
) => {
	const { outputChannel, specManager } = services;

	return async (item: unknown) => {
		try {
			const changeId = getChangeIdOrThrow(item);
			const ws = getWorkspaceFolderOrThrow();
			const changeBase = Uri.joinPath(ws.uri, "openspec", "changes", changeId);

			const promptPath = await ensureReviewPromptTemplate(
				ws.uri,
				services.extensionUri
			);
			const promptTemplate = await readUtf8OrThrow(promptPath, "review prompt");

			const { proposalPath, tasksPath, designPath } =
				await getChangeDocumentPaths(changeBase);
			const deltaSpecs = await getDeltaSpecPaths(
				changeBase,
				specManager,
				changeId
			);

			const composedPrompt = composeReviewPrompt({
				promptTemplate,
				changeId,
				proposalPath,
				tasksPath,
				designPath,
				deltaSpecs,
			});

			outputChannel.appendLine(
				`[Review Change] Reviewing change: ${changeId} (artifacts: proposal=${proposalPath ? "y" : "n"} tasks=${tasksPath ? "y" : "n"} design=${designPath ? "y" : "n"} specs=${deltaSpecs.length})`
			);

			await sendPromptToChat(composedPrompt, { instructionType: "runPrompt" });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			outputChannel.appendLine(`[Review Change] Failed: ${message}`);
			throw new Error(t("error.readReviewPromptFailed", { msg: message }));
		}
	};
};

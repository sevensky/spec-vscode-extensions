import { vscode } from "@/bridge/vscode";
import type { ReviewComment } from "../../types";

interface CommentsCardProps {
	reviewComments: ReviewComment[];
}

const DOC_LABEL: Record<string, string> = {
	proposal: "Proposal",
	design: "Design",
	tasks: "Tasks",
	specs: "Specs",
};

/** 评论聚合卡片：按 doc 分组 + 每 doc Run refinement 入口 */
export function CommentsCard({ reviewComments }: CommentsCardProps) {
	if (!reviewComments || reviewComments.length === 0) return null;

	// 按 doc 分组
	const grouped = new Map<string, ReviewComment[]>();
	for (const comment of reviewComments) {
		const arr = grouped.get(comment.doc) ?? [];
		arr.push(comment);
		grouped.set(comment.doc, arr);
	}

	return (
		<div className="rounded-lg border border-[color:var(--vscode-panel-border)] bg-[color:var(--vscode-editor-background)] p-3">
			<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--vscode-descriptionForeground)]">
				待处理评论
			</h3>
			<ul className="space-y-2">
				{Array.from(grouped.entries()).map(([doc, comments]) => (
					<li key={doc} className="rounded border border-[color:var(--vscode-panel-border)] p-2">
						<div className="mb-1 flex items-center justify-between">
							<span className="text-xs font-medium text-[color:var(--vscode-foreground)]">
								{DOC_LABEL[doc] ?? doc}{" "}
								<span className="text-[color:var(--vscode-descriptionForeground)]">
									({comments.length})
								</span>
							</span>
							<button
								type="button"
								onClick={() => vscode.postMessage({ command: "runDocRefinement", doc })}
								className="cursor-pointer rounded border border-[color:var(--vscode-focusBorder)] px-2 py-0.5 text-[10px] text-[color:var(--vscode-focusBorder)] hover:bg-[color:color-mix(in_srgb,var(--vscode-focusBorder)_15%,transparent)]"
							>
								Refine
							</button>
						</div>
						<ul className="space-y-1">
							{comments.map((c) => (
								<li key={c.id} className="text-xs text-[color:var(--vscode-foreground)]">
									{c.comment}
								</li>
							))}
						</ul>
					</li>
				))}
			</ul>
		</div>
	);
}

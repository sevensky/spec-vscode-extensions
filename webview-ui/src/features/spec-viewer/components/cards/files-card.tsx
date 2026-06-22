import { vscode } from "@/bridge/vscode";

interface FilesCardProps {
	filesModified: string[];
}

/** 修改文件列表卡片（点击打开） */
export function FilesCard({ filesModified }: FilesCardProps) {
	if (!filesModified || filesModified.length === 0) return null;
	return (
		<div className="rounded-lg border border-[color:var(--vscode-panel-border)] bg-[color:var(--vscode-editor-background)] p-3">
			<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--vscode-descriptionForeground)]">
				修改文件 ({filesModified.length})
			</h3>
			<ul className="space-y-0.5">
				{filesModified.map((file) => (
					<li key={file}>
						<button
							type="button"
							onClick={() => vscode.postMessage({ command: "openFile", path: file })}
							className="cursor-pointer text-left text-xs text-[color:var(--vscode-textLinkForeground)] hover:underline"
						>
							{file}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}

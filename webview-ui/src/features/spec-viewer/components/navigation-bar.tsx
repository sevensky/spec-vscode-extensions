import type { DocEntry, DocType } from "../types";
import { cn } from "@/lib/utils";

interface NavigationBarProps {
	docs: DocEntry[];
	currentDoc: DocType;
	onSwitch: (docType: DocType) => void;
}

const DOC_LABEL: Record<DocType, string> = {
	proposal: "Proposal",
	design: "Design",
	tasks: "Tasks",
	specs: "Specs",
};

/** 步骤导航：文档 tab 切换。当前 tab 高亮，缺失文档标注。 */
export function NavigationBar({ docs, currentDoc, onSwitch }: NavigationBarProps) {
	return (
		<nav className="flex gap-1 border-b border-[color:var(--vscode-panel-border)]">
			{docs.map((doc) => {
				const active = doc.type === currentDoc;
				return (
					<button
						key={doc.type}
						type="button"
						onClick={() => onSwitch(doc.type)}
						className={cn(
							"-mb-px border-b-2 px-3 py-2 text-sm transition-colors cursor-pointer",
							active
								? "border-[color:var(--vscode-focusBorder)] text-[color:var(--vscode-foreground)]"
								: "border-transparent text-[color:var(--vscode-descriptionForeground)] hover:text-[color:var(--vscode-foreground)]"
						)}
					>
						{DOC_LABEL[doc.type]}
						{!doc.exists && (
							<span className="ml-1.5 text-xs text-[color:var(--vscode-errorForeground)]">
								缺失
							</span>
						)}
					</button>
				);
			})}
		</nav>
	);
}

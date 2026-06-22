import { useEffect, useRef, useState } from "react";
import { vscode } from "@/bridge/vscode";
import type {
	DocType,
	FooterActionId,
	InboundMessage,
	ViewerPayload,
} from "./types";
import { SpecHeader } from "./components/spec-header";
import { NavigationBar } from "./components/navigation-bar";
import { MarkdownContent } from "./components/markdown-content";
import { FooterActions } from "./components/footer-actions";
import { ActivityPanel } from "./components/activity-panel";

/**
 * spec-viewer React 面板主组件。
 *
 * 数据流：
 *   - extension → webview: {command:'state', payload} 推送完整 ViewerPayload
 *   - webview → extension: ready / switchDoc / footerAction / refreshContent
 *
 * changeName 等全部状态由 payload 持有，webview 不自行解析路径。
 */
export function SpecViewer() {
	const [payload, setPayload] = useState<ViewerPayload | null>(null);
	const [activityVisible, setActivityVisible] = useState(false);
	const tocRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const listener = (event: MessageEvent) => {
			const msg = event.data as InboundMessage;
			if (msg?.command === "state" && msg.payload) {
				setPayload(msg.payload);
			}
		};
		window.addEventListener("message", listener);
		// 握手：通知 extension 面板已就绪，请求初始状态
		vscode.postMessage({ command: "ready" });
		return () => window.removeEventListener("message", listener);
	}, []);

	if (!payload) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-[color:var(--vscode-descriptionForeground)]">
				加载中…
			</div>
		);
	}

	const currentDocEntry = payload.docs.find((d) => d.type === payload.currentDoc);

	const handleSwitch = (docType: DocType) => {
		vscode.postMessage({ command: "switchDoc", docType });
	};

	const handleAction = (id: FooterActionId) => {
		vscode.postMessage({ command: "footerAction", id });
	};

	return (
		<div className="viewer-container mx-auto max-w-5xl px-4 py-3 gap-4">
			<SpecHeader
				changeName={payload.changeName}
				status={payload.status}
				step={payload.step}
				agent={payload.agent}
			/>
			<NavigationBar
				docs={payload.docs}
				currentDoc={payload.currentDoc}
				onSwitch={handleSwitch}
			/>
			<div className="content-area min-h-0 flex-1 overflow-hidden !flex-row gap-4 items-flex-start">
				{activityVisible ? (
					<main className="min-w-0 flex-1 overflow-auto py-2">
						<ActivityPanel
							history={payload.history}
							approach={payload.approach}
							decisions={payload.decisions}
							concerns={payload.concerns}
							filesModified={payload.filesModified}
							taskSummaries={payload.taskSummaries}
							reviewComments={payload.reviewComments}
						/>
					</main>
				) : (
					<>
						<main className="min-w-0 flex-1 overflow-auto py-2">
							<MarkdownContent doc={currentDocEntry} reviewComments={payload.reviewComments} tocEl={tocRef.current} />
						</main>
						<aside
							ref={tocRef}
							id="spec-toc"
							className="spec-toc w-48 shrink-0 overflow-auto"
						/>
					</>
				)}
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => setActivityVisible((v) => !v)}
					className={`cursor-pointer rounded border px-3 py-1 text-xs transition-colors ${
						activityVisible
							? "border-[color:var(--vscode-focusBorder)] bg-[color:color-mix(in_srgb,var(--vscode-focusBorder)_15%,transparent)] text-[color:var(--vscode-focusBorder)]"
							: "border-[color:var(--vscode-panel-border)] text-[color:var(--vscode-descriptionForeground)] hover:text-[color:var(--vscode-foreground)]"
					}`}
				>
					{activityVisible ? "返回文档" : "Activity"}
				</button>
				<div className="flex-1" />
				<FooterActions actions={payload.footer} onAction={handleAction} />
			</div>
		</div>
	);
}

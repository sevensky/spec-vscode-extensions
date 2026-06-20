/** webview 英文字典（默认） */
export const en: Record<string, string> = {
	// ── common ──
	"common.cancel": "Cancel",
	"common.send": "Send",
	"common.clear": "Clear",
	"common.creating": "Creating…",

	// ── simple view ──
	"simple.title": "Simple View",
	"simple.description": "This is a simple WebView view.",

	// ── interactive view ──
	"interactive.title": "Interactive Playground",
	"interactive.description": "Compose a request for the extension and review the response below.",
	"interactive.placeholder": "Send a message to the extension...",
	"interactive.sendHint": "Press ⌘⏎ / Ctrl+Enter to send",
	"interactive.latestResponse": "Latest response",
	"interactive.clearResponse": "Clear response",
	"interactive.emptyResponse": "Responses from the extension will show up here once available.",

	// ── create-spec ──
	"createSpec.title": "Create New Spec",
	"createSpec.subtitle": "Provide context for the new specification. Product Context is required; other sections are optional but recommended.",
	"createSpec.productContext": "Product Context",
	"createSpec.productContextPlaceholder": "Describe the goal, background, and what you want to achieve…",
	"createSpec.productContextRequired": "Product Context is required.",
	"createSpec.keyScenarios": "Key Scenarios",
	"createSpec.keyScenariosPlaceholder": "e.g. When user clicks save, then a notification appears...",
	"createSpec.technicalConstraints": "Technical Constraints",
	"createSpec.technicalConstraintsPlaceholder": "Libraries, patterns, or existing systems to consider…",
	"createSpec.relatedFiles": "Related Files",
	"createSpec.relatedFilesPlaceholder": "src/utils/auth.ts, src/components/Login.tsx...",
	"createSpec.openQuestions": "Open Questions",
	"createSpec.openQuestionsPlaceholder": "Any uncertainties or risks?",
	"createSpec.submitFailed": "Failed to submit.",
	"createSpec.changesAvailable": "Changes are still available. Close action was cancelled.",
	"createSpec.sending": "Sending spec prompt…",
	"createSpec.draftSaved": "Draft saved at {time}",
	"createSpec.unsavedChanges": "Unsaved changes",
	"createSpec.allSaved": "All changes saved",
	"createSpec.createButton": "Create Spec",

	// ── create-steering ──
	"createSteering.title": "Create Custom Steering",
	"createSteering.subtitle": "Share the guardrails and project-specific rules you want every agent to follow. Summary is required; other sections are optional.",
	"createSteering.guidanceSummary": "Guidance Summary",
	"createSteering.guidanceSummaryPlaceholder": "Describe the core guidance you want agents to follow…",
	"createSteering.guidanceSummaryRequired": "Guidance summary is required.",
	"createSteering.audience": "Audience & Ownership",
	"createSteering.audiencePlaceholder": "Who should follow this guidance? Include roles, teams, or repos…",
	"createSteering.keyPractices": "Key Practices to Follow",
	"createSteering.keyPracticesPlaceholder": "List the behaviors, patterns, or examples the agent must follow…",
	"createSteering.pitfalls": "Pitfalls to Avoid",
	"createSteering.pitfallsPlaceholder": "Capture anti-patterns, gotchas, or things agents must never do…",
	"createSteering.submitFailed": "Failed to submit steering prompt.",
	"createSteering.createButton": "Create Steering",

	// ── unknown page ──
	"unknownPage": "Unknown page: {page}",
};

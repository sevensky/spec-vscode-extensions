import type { AiAgent } from "./config-manager";

/**
 * Agent command path configuration.
 * Each agent has its own command directory and file naming convention,
 * matching the OpenSpec CLI adapter behavior.
 */
export interface AgentCommandConfig {
	/** Command directory segments (relative to workspace root) */
	readonly dir: readonly string[];
	/** v1 filename builder */
	readonly v1Filename: (id: string) => string;
	/** Legacy filename builder (optional, only github-copilot has legacy) */
	readonly legacyFilename?: (id: string) => string;
}

/**
 * Command ID mapping: operation -> { v1, legacy }
 * v1 is the new opsx-* format; legacy is the old openspec-* format (github-copilot only).
 */
export const COMMAND_IDS = {
	propose: { v1: "propose", legacy: "proposal" },
	apply: { v1: "apply", legacy: "apply" },
	archive: { v1: "archive", legacy: "archive" },
} as const;

export type CommandId = keyof typeof COMMAND_IDS;

/**
 * Agent -> command path config mapping.
 * Mirrors OpenSpec CLI adapters (src/core/command-generation/adapters/).
 */
export const AGENT_COMMAND_CONFIGS: Record<AiAgent, AgentCommandConfig> = {
	"github-copilot": {
		dir: [".github", "prompts"],
		v1Filename: (id) => `opsx-${id}.prompt.md`,
		legacyFilename: (legacyId) => `openspec-${legacyId}.prompt.md`,
	},
	claude: {
		dir: [".claude", "commands", "opsx"],
		v1Filename: (id) => `${id}.md`,
	},
	codebuddy: {
		dir: [".codebuddy", "commands", "opsx"],
		v1Filename: (id) => `${id}.md`,
	},
	trae: {
		dir: [".trae", "commands", "opsx"],
		v1Filename: (id) => `${id}.md`,
	},
	codex: {
		dir: [".codex", "prompts"],
		v1Filename: (id) => `opsx-${id}.md`,
	},
};

/**
 * Get the v1 filename for a given agent and command ID.
 */
export const getV1Filename = (agent: AiAgent, commandId: CommandId): string =>
	AGENT_COMMAND_CONFIGS[agent].v1Filename(COMMAND_IDS[commandId].v1);

/**
 * Get the legacy filename for a given agent and command ID.
 * Returns undefined if the agent has no legacy format.
 */
export const getLegacyFilename = (
	agent: AiAgent,
	commandId: CommandId
): string | undefined => {
	const config = AGENT_COMMAND_CONFIGS[agent];
	if (!config.legacyFilename) {
		return undefined;
	}
	return config.legacyFilename(COMMAND_IDS[commandId].legacy);
};

/**
 * Agent -> "add document to chat" command mapping.
 * - github-copilot / codex: use Copilot Chat's `chatgpt.addToThread`
 * - others: null (no equivalent command; caller falls back to clipboard)
 */
export const AGENT_CHAT_COMMANDS: Record<AiAgent, string | null> = {
	"github-copilot": "chatgpt.addToThread",
	codex: "chatgpt.addToThread",
	claude: null,
	trae: null,
	codebuddy: null,
};

/**
 * @deprecated Tests for the deprecated copilot-chat-utils re-export.
 * New tests should be added to agent-chat-utils.test.ts.
 */
import { describe, it, expect } from "vitest";
import { addDocumentToCopilotChat } from "./copilot-chat-utils";

describe("copilot-chat-utils (deprecated re-export)", () => {
	it("should re-export addDocumentToAgentChat as addDocumentToCopilotChat", () => {
		expect(addDocumentToCopilotChat).toBeDefined();
		expect(typeof addDocumentToCopilotChat).toBe("function");
	});
});

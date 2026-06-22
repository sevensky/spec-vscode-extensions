import { generatePreamble } from "../features/spec-context/preamble-generator";
import type { AgentId } from "./agent-provider";
import type { SpecStep } from "../types/spec-context.types";

/** opsx 命令 → SpecStep 映射（动作对应的命令和下一阶段） */
const ACTION_COMMANDS: Record<string, { command: string; nextStep: SpecStep }> =
	{
		new: { command: "opsx:new", nextStep: "design" },
		ff: { command: "opsx:ff", nextStep: "tasks" },
		continue: { command: "opsx:continue", nextStep: "tasks" },
		explore: { command: "opsx:explore", nextStep: "propose" },
		apply: { command: "opsx:apply", nextStep: "archive" },
		archive: { command: "opsx:archive", nextStep: "archive" },
		sync: { command: "opsx:sync", nextStep: "tasks" },
		verify: { command: "opsx:verify", nextStep: "archive" },
	};

interface BuildPromptOptions {
	/** 动作名（new/apply/archive 等，对应 opsx 命令） */
	action: string;
	/** 变更名（change 目录名） */
	changeName: string;
	/** 使用的 agent */
	agent: AgentId;
	/** 当前 step（用于 preamble） */
	step: SpecStep;
}

/**
 * 将流程动作组装为 /opsx:xxx 指令 + preamble，供 provider 发送。
 *
 * @returns 完整的指令字符串（preamble + 换行 + /opsx:command changeName）
 */
export function buildPrompt(opts: BuildPromptOptions): string {
	const { action, changeName, agent, step } = opts;

	const actionDef = ACTION_COMMANDS[action];
	if (!actionDef) {
		// 未知动作：直接用 action 名作为命令
		return `/opsx:${action} ${changeName}`;
	}

	const preamble = generatePreamble({
		changeName,
		step,
		agent,
		nextStep: actionDef.nextStep,
	});

	return `${preamble}\n\n/opsx:${actionDef.command} ${changeName}`;
}

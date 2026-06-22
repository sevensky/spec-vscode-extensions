import type { SpecStep } from "../../types/spec-context.types";

/**
 * PreambleGenerator — 生成注入 agent 指令前的 preamble。
 *
 * preamble 是给 agent 看的英文指令（非用户可见文案），
 * 指示 agent 在完成步骤后更新 .spec-context.json。
 * 用英文是因为 agent 对英文指令的听话度更稳定。
 */

interface PreambleOptions {
	/** 变更名（change 目录名） */
	changeName: string;
	/** 当前执行的 step */
	step: SpecStep;
	/** 使用的 agent 标识 */
	agent: string;
	/** 该 step 完成后应推进到的下一个 step */
	nextStep: SpecStep;
}

/**
 * 生成 preamble 文本。
 *
 * 告诉 agent：
 * 1. 它正在为哪个变更执行哪个动作
 * 2. 完成后应更新 .spec-context.json 的哪些字段
 * 3. 只更新该变更的状态文件，勿动其他变更
 */
export function generatePreamble(opts: PreambleOptions): string {
	const { changeName, step, nextStep } = opts;

	return [
		`[OpenSpec Context] You are executing the "${step}" step for change "${changeName}".`,
		`After completing this step, update the file openspec/changes/${changeName}/.spec-context.json:`,
		`  - Set "step" to "${nextStep}"`,
		`  - Set "status" to "active"`,
		`  - Append to "history": { "step": "${step}", "status": "completed", "at": "<ISO timestamp>", "agent": "${opts.agent}" }`,
		`Only update the .spec-context.json for change "${changeName}". Do NOT modify other change directories.`,
	].join("\n");
}

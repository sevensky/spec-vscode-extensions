import { useEffect, useState } from "react";

interface ElapsedTimerProps {
	/** ISO 起始时间 */
	startedAt: string;
}

/**
 * 实时耗时计时器：从 startedAt 开始每秒更新显示。
 * 格式：Xh Ym Zs（不足的省略）。
 */
export function ElapsedTimer({ startedAt }: ElapsedTimerProps) {
	const [elapsed, setElapsed] = useState(() => computeElapsed(startedAt));

	useEffect(() => {
		const timer = setInterval(() => {
			setElapsed(computeElapsed(startedAt));
		}, 1000);
		return () => clearInterval(timer);
	}, [startedAt]);

	return <span className="tabular-nums">{elapsed}</span>;
}

function computeElapsed(startedAt: string): string {
	const start = new Date(startedAt).getTime();
	if (Number.isNaN(start)) return "—";
	const diff = Date.now() - start;
	const totalSec = Math.floor(diff / 1000);
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	const parts: string[] = [];
	if (h > 0) parts.push(`${h}h`);
	if (m > 0 || h > 0) parts.push(`${m}m`);
	parts.push(`${s}s`);
	return parts.join(" ");
}

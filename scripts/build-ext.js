// 使用 esbuild JS API 构建，绕过 pnpm bin shim 对原生二进制的错误处理
const esbuild = require("esbuild");

esbuild
	.build({
		entryPoints: ["src/extension.ts"],
		bundle: true,
		platform: "node",
		target: "node16",
		external: ["vscode"],
		outfile: "dist/extension.js",
		format: "cjs",
		sourcemap: false,
	})
	.then(() => {
		console.log("  dist/extension.js  built");
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});

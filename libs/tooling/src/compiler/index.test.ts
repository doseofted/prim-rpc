import { test } from "vitest"
import { build, type BuildOptions } from "esbuild"
import plugin from "."

const buildOptions: BuildOptions = {
	entryPoints: ["src/compiler/test/index.ts"],
	tsconfig: "src/compiler/test/tsconfig.json",
	outdir: "src/compiler/test/dist",
	bundle: true,
	format: "esm",
}

test("It builds", async () => {
	const a = await build({
		...buildOptions,
		plugins: [plugin.esbuild({ debug: true, client: { type: "generated", endpoint: "/" } })],
	})
	console.log(a)
})

// @ts-check
import { defineConfig } from "tsup"

export default defineConfig({
	entry: ["src/docs/index.ts", "src/build/index.ts", "src/cli/index.ts"],
	target: "es2020",
	dts: true,
	sourcemap: true,
	format: ["esm"],
	clean: true,
})

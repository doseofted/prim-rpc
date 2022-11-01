// @ts-check
import { defineConfig } from "tsup"

export default defineConfig(options => ({
	...options,
	entry: ["src/index.ts"],
	target: "ES2020",
	dts: true,
	sourcemap: true,
	format: ["esm", "cjs"],
	clean: true,
}))

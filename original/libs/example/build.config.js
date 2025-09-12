// @ts-check
import { defineConfig } from "tsup"
import { $ } from "zx"

export default defineConfig(options => ({
	...options,
	entry: ["src/index.ts"],
	target: "es2020",
	dts: true,
	sourcemap: true,
	format: ["esm"],
	clean: true,
	async onSuccess() {
		await $`pnpm document`
	},
}))

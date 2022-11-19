// @ts-check
import { defineConfig } from "tsup"

export default defineConfig(options => ({
	...options,
	entry: ["src/index.ts"],
	target: "ES2022",
	dts: true,
	format: ["esm"],
	clean: true,
}))

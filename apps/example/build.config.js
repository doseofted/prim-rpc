// @ts-check
import { defineConfig } from "tsup"

export default defineConfig({
	entry: ["src/index.ts"],
	target: "es2022",
	dts: true,
	format: ["esm"],
	clean: true,
})

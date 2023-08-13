// @ts-check
import { defineConfig } from "tsup"

export default defineConfig({
	entry: ["src/index.ts"],
	target: "es2020",
	format: ["esm"],
	dts: true,
	clean: true,
})

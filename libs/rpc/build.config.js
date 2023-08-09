// @ts-check
import { defineConfig } from "tsup"

export default defineConfig(options => ({
	...options,
	entry: ["src/index.ts"],
	target: "es2020",
	dts: true,
	// NOTE: CJS format won't work until "nanoid" and "serialize-error" are replaced
	format: ["esm"],
	clean: true,
}))

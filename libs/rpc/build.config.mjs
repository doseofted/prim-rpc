// @ts-check
import { defineConfig } from "tsup"

export default defineConfig(options => ({
	...options,
	entry: ["src/index.ts"],
	target: "ES2020",
	dts: true,
	sourcemap: true,
	format: ["esm"], // NOTE: CJS export won't work until "nanoid" and "serialize-error" are replaced
	clean: true,
}))

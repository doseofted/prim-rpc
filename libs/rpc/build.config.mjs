// @ts-check
import { defineConfig } from "tsup"

export default defineConfig(options => ({
	...options,
	entry: ["src/index.ts"],
	target: "ES2020",
	dts: true,
	sourcemap: true,
	// NOTE: CJS format won't work until "nanoid" and "serialize-error" are replaced
	format: ["esm"],
	clean: true,
	// NOTE: enabling line below may allow Prim-RPC to be used from ESM-only modules
	// noExternal: ["proxy-deep", "query-string"],
}))

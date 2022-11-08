// @ts-check
import { defineConfig } from "tsup"

export default defineConfig(options => ({
	...options,
	entry: ["src/index.ts"],
	target: "ES2020",
	dts: true,
	// NOTE: CJS format won't work until "nanoid" and "serialize-error" are replaced
	format: ["esm"],
	clean: true,
	// NOTE: the following modules are CJS and can't be imported from pure-ESM module.
	// Since they're imported but listed in package.json as devDependencies, they are already included in bundle with an
	// ESM wrapper but they're also added below to be explicit
	// noExternal: ["proxy-deep", "query-string"],
}))

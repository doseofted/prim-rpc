// @ts-check
import { defineConfig } from "tsup"

export default defineConfig(options => ({
	...options,
	entry: [
		"src/server/fastify.ts",
		"src/server/express.ts",
		"src/server/ws.ts",
		"src/client/axios.ts",
		"src/client/browser-api.ts",
	],
	target: "ES2020",
	dts: true,
	sourcemap: true,
	format: ["esm", "cjs"],
	clean: true,
}))

// @ts-check
import { defineConfig } from "tsup"

export default defineConfig(options => ({
	...options,
	entry: [
		// TODO: entries need to separated into their own packages since packageJson.exports won't be a useful setting any time soon
		"src/server/fastify.ts",
		"src/server/express.ts",
		"src/server/ws.ts",
		"src/client/axios.ts",
		"src/client/browser-api.ts",
	],
	target: "ES2020",
	dts: true,
	format: ["esm"],
	clean: true,
}))

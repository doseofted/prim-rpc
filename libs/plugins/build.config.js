// @ts-check
import { defineConfig } from "tsup"

export default defineConfig({
	entry: [
		// TODO: entries need to separated into their own packages since packageJson.exports won't be a useful setting any time soon
		"src/server/fastify.ts",
		"src/server/express.ts",
		"src/server/h3.ts",
		"src/server/ws.ts",
		"src/client/axios.ts",
		"src/client/browser.ts",
		"src/client/browser-fetch.ts",
		"src/client/browser-websocket.ts",
		"src/ipc/web-worker.ts",
		"src/server/nextjs.ts",
		"src/server/hono.ts",
	],
	target: "es2020",
	format: ["esm"],
	dts: true,
	clean: true,
})

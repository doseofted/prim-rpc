// @ts-check
import { defineConfig } from "tsup"

const banner = `
// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0`.replace(/^\n/g, "")

export default defineConfig({
	entry: [
		// TODO: entries need to separated into their own packages in the future so they can be versioned separately
		"src/server/astro.ts",
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
	banner: { js: banner },
})

#!/usr/bin/env zx
import { createEcho, gatherPackageName, mode } from "../../misc/zx-utils.mjs"
$.verbose = false

const prefix = await gatherPackageName('frontend/package.json')
const echo = createEcho(prefix)

$.verbose = true
let dev = new Promise(r => r()) // simple promise to resolve, if not in dev mode

if (mode !== "production") {
	echo`Running in ${mode} mode. Building in background ...`
	dev = nothrow($`pnpm dev --filter="frontend"`) // wrap in `nothrow` since it's just a dev process
}

const args = process.argv.slice(3).join(" ")
echo`Starting app in ${mode} mode ...`
try {
	// NOTE: server may go here in the future, for now just resolve and depend on dev process (won't work in prod yet)
	const app = new Promise(r => r()) // $`pnpm ${args || "preview"} --filter="frontend"`
	process.on("SIGTERM", () => { // sigterm received from docker-compose
		app.kill("SIGINT") // send interrupt, as if used interactively
		if (dev) { dev.kill("SIGINT") } // same with dev, if in dev mode
	})
	await Promise.all([app, dev])
} catch (p) {
	echo`app exited, code ${p.exitCode}`
	if (p.stderr) { echo`error: ${p.stderr}` }
}

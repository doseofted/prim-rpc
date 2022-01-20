#!/usr/bin/env zx
import { createEcho, gatherPackageName, mode } from "../misc/zx-utils.mjs"
$.verbose = false

const prefix = gatherPackageName('libraries/package.json')
const echo = createEcho(prefix)

let dev = new Promise(r => r()) // simple promise to resolve, if not in dev mode
if (mode !== "production") {
	echo`Running in ${mode} mode. Building in background ...`
	dev = nothrow($`pnpm dev`) // wrap in `nothrow` since it's just a dev process
}

echo`Keeping libraries container open (to use mounted volumes), in ${mode} mode ...`
try {
	// TODO: use script that keeps container open so volumes can be mounted to others to use build libraries
	const app = $`tail -f /dev/null`
	process.on("SIGTERM", () => { // sigterm received from docker-compose
		app.kill("SIGINT") // send interrupt, as if used interactively
		if (dev) { dev.kill("SIGINT") } // same with dev, if in dev mode
	})
	await Promise.all([app, dev])
} catch (p) {
	echo`app exited, code ${p.exitCode}`
	if (p.stderr) { echo`error: ${p.stderr}` }
}

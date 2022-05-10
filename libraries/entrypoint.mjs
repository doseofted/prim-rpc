#!/usr/bin/env zx
/* eslint-disable no-undef */
import { createEcho, mode } from "../misc/zx-utils.mjs"
$.verbose = false

const prefix = "libraries"
const echo = createEcho(prefix)

$.verbose = true
let devPackages = new Promise(r => r()) // simple promise to resolve, if not in dev mode
let devInterface = new Promise(r => r()) // simple promise to resolve, if not in dev mode
// let test = new Promise(r => r()) // simple promise to resolve, if not in dev mode
if (mode !== "production") {
	echo`Running in ${mode} mode. Building in background ...`
	devPackages = nothrow($`pnpm packages:dev`) // wrap in `nothrow` since it's just a dev process
	devInterface = nothrow($`pnpm --filter="./libraries/interface/**" build --watch`) // wrap in `nothrow` since it's just a dev process
}

echo`Keeping container open to use mounted volumes.`
try {
	// TODO: use script that keeps container open so volumes can be mounted to others to use build libraries
	const app = $`tail -f /dev/null`
	process.on("SIGTERM", () => { // sigterm received from docker-compose
		app.kill("SIGINT") // send interrupt, as if used interactively
		if (devPackages) { dev.kill("SIGINT") } // same with dev, if in dev mode
		if (devInterface) { dev.kill("SIGINT") } // same with dev, if in dev mode
		// if (test) { test.kill("SIGINT") } // same with dev, if in dev mode
	})
	await Promise.all([app, devPackages, devInterface])
} catch (p) {
	echo`app exited, code ${p.exitCode}`
	if (p.stderr) { echo`error: ${p.stderr}` }
}

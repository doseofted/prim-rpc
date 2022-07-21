#!/usr/bin/env zx
import { $ } from "zx"

/** @type {{ [processName: string]: import("zx").ProcessPromise }} */
const processes = {}
process.on("SIGTERM", () => { // sigterm received from docker-compose
	Object.values(processes).forEach(proc => {
		proc.kill("SIGINT") // send interrupt, as if used interactively
	})
})

const inDevelopment = process.env.NODE_ENV === "development"
console.log("what")
if (inDevelopment) {
	processes.buildLibs = $`pnpm watch-libs`
	processes.buildUi = $`pnpm watch-ui`
} else {
	processes.tail = $`tail -f /dev/null`
}

await Promise.all(Object.values(processes))

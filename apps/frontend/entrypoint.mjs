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
if (inDevelopment) {
	processes.dev = $`pnpm dev --host`
} else {
	// TODO: determine if preview command should be used at all or if project should just switch to Nuxt
	// `preview` will keep container open and allow for debugging of differences between dev/prod builds
	// but built files will be served by Caddy rather than using `preview`
	processes.app = $`pnpm preview --host`
}

await Promise.all(Object.values(processes))

#!/usr/bin/env zx
$.verbose = false

/** Add color to console logs then echo. */
function echo(strings, ...vals) {
	let str = strings[0]
	for (let i = 0; i < vals.length; i++) { str += chalk`{green ${vals[i]}}` + strings[i + 1] }
	console.log(chalk`{green.bold [ ${prefix} ]}`, str)
}

let prefix = "project"
try {
	prefix = JSON.parse(await $`cat package.json`)?.name ?? prefix
} catch (error) { echo`Could not gather project name from package.json` }

$.verbose = true

const mode = process.env.NODE_ENV || "production"
let dev = new Promise(r => r()) // simple promise to resolve, if not in dev mode

if (mode !== "production") {
	echo`Running in ${mode} mode. Building in background ...`
	dev = nothrow($`pnpm dev`) // wrap in `nothrow` since it's just a dev process
}

const args = process.argv.slice(3).join(" ")
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

#!/usr/bin/env zx
$.verbose = false

function createEcho(prefix = "project") {
	/** Add color to console logs then echo. */
	return function echo(strings, ...vals) {
		let str = strings[0]
		for (let i = 0; i < vals.length; i++) { str += chalk`{green ${vals[i]}}` + strings[i + 1] }
		console.log(chalk`{green.bold [ ${prefix} ]}`, str)
	}
}

function gatherPackageName(packageJson = "package.json") {
	let prefix
	try {
		prefix = JSON.parse(await $`cat ${packageJson}`)?.name ?? prefix
	} catch (error) {
		echo`Could not gather project name from package.json`
	}
	return prefix
}

const mode = process.env.NODE_ENV || "production"

export { createEcho, gatherPackageName, mode }

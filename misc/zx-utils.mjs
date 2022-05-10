#!/usr/bin/env zx
/* eslint-disable no-undef */
$.verbose = false // toggle off default
import { echo as baseEcho } from "zx/experimental"
/**
 * Log output with given prefix and highlight variables. Use like so:
 * 
 * ```js
 * const echo = createEcho("name")
 * const there = "here"
 * echo`Something ${there}`
 * // outputs "[ name ] Something here"
 * ```
 */
function createEcho(prefix = "project") {
	/** Add color to console logs then echo. */
	return function echo(strings, ...vals) {
		let str = strings[0]
		for (let i = 0; i < vals.length; i++) { str += chalk`{green ${vals[i]}}` + strings[i + 1] }
		baseEcho(chalk`{green.bold [${prefix}]}`, str)
	}
}
const echo = createEcho("zx-utils")

/**
 * Gather name of package from `package.json` file.
 */
async function gatherPackageName(packageJson = "package.json") {
	let prefix
	try {
		prefix = JSON.parse(await $`cat ${packageJson}`)?.name ?? prefix
	} catch (error) {
		echo`Could not gather project name from package.json`
	}
	return prefix
}

const mode = process.env.NODE_ENV || "production"

$.verbose = true // toggle default back on

export { createEcho, gatherPackageName, mode }

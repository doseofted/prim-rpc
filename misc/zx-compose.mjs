#!/usr/bin/env zx
/* eslint-disable no-undef */
import { createEcho } from "./zx-utils.mjs"
const echo = createEcho("compose")
const {
	mode: composeEnv = "development",
	_: given,
	h = false, help = false
} = argv

const base = ["-f", "docker-compose.yml"]
const composeEnvs = {
	development: [...base, "-f", "docker-compose.dev.yml"],
	production: [...base, "-f", "misc/logging.yml", "-f", "docker-compose.prod.yml"]
}
const composeEnvAliases = {
	...composeEnvs,
	dev: composeEnvs["development"],
	prod: composeEnvs["production"]
}

if (h || help) {
	echo`A utility that makes docker-compose commands shorter for this project.\n`
	echo`Usage: ${"zx zx-compose.mjs --mode=dev -- up"}`
	echo`--mode: one of ${Object.keys(composeEnvs).join(", ")} or alises`
	echo `-- {CMD}: Arguments for Docker Compose like ${"up -d"}`
	process.exit(0)
}

const args = composeEnvAliases[composeEnv]
const cmd = given.slice(1)
await $`docker compose ${args} ${cmd}`

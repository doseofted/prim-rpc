#!/usr/bin/env zx
// @ts-check
import { $ } from "zx"
// import { watch } from "chokidar"
// import path from "node:path"
// import { Parcel, createWorkerFarm } from "@parcel/core"
// import { build } from "vite"
// import { fileURLToPath } from "node:url"
// let workerFarm = createWorkerFarm()
// /** @param {string} entry */
// const parcelBuild = (entry) => new Parcel({
// 	workerFarm,
// 	entries: [entry], 
// 	defaultConfig: "@parcel/config-default",
// 	additionalReporters: [
// 		{
// 			packageName: "@parcel/reporter-cli",
// 			resolveFrom: fileURLToPath(import.meta.url),
// 		},
// 	],
// }).run()
// /** @param {string} root */
// const viteBuild = (root) => {
// 	return build({ root, configFile: "" })
// }
// const libsPath = path.join(__dirname, "libs")
// watch(libsPath, { ignored: /node_modules/ })
// 	.on("all", (e, p) => {
// 		console.log(e, path.relative(libsPath, p).split(path.sep)[0])
// 	})

/** @type {{ [processName: string]: import("zx").ProcessPromise }} */
const processes = {}
process.on("SIGTERM", () => { // sigterm received from docker-compose
	Object.values(processes).forEach(proc => {
		proc.kill("SIGINT") // send interrupt, as if used interactively
	})
})

const inDevelopment = process.env.NODE_ENV === "development"
if (inDevelopment) {
	processes.buildLibs = $`pnpm watch-libs`
} else {
	processes.tail = $`tail -f /dev/null`
}

await Promise.all(Object.values(processes))

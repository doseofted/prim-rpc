#!/usr/bin/env zx
// @ts-check
import { $ } from "zx"
import { watch } from "chokidar"
import path from "node:path"
// import fs from "node:fs/promises"
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
const libsPath = path.join(__dirname, "libs")
watch(libsPath, { ignored: /node_modules/, ignoreInitial: true })
	.on("all", async (e, p) => {
		const relativePath = path.relative(libsPath, p)
		const projectPath = relativePath.split(path.sep)[0]
		const filter = "." + path.sep + path.join("libs", projectPath)
		const createProc = () => {
			const proc = $`pnpm build --filter=${filter}`
			void (async () => { await proc; delete processes[projectPath] })()
			return proc
		}
		processes[projectPath] = processes[projectPath] || createProc()
	})
/** @type {{ [processName: string]: import("zx").ProcessPromise }} */
const processes = {}
process.on("SIGTERM", () => { // sigterm received from docker-compose
	Object.values(processes).forEach(proc => {
		proc.kill("SIGINT") // send interrupt, as if used interactively
	})
})

const inDevelopment = process.env.NODE_ENV === "development"
if (inDevelopment) {
	// processes.buildLibs = $`pnpm watch-libs`
} else {
	processes.tail = $`tail -f /dev/null`
}

await Promise.all(Object.values(processes))

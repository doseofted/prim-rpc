// @ts-check
import { defineConfig } from "tsup"
import { $, fs, path } from "zx"
import { major } from "semver"

const banner = `
// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0`.replace(/^\n/g, "")

export default defineConfig({
	entry: ["src/compiler/index.ts", "src/docs/index.ts", "src/build/index.ts", "src/cli/index.ts"],
	target: "es2020",
	format: ["esm"],
	dts: true,
	clean: true,
	banner: { js: banner },
	async onSuccess() {
		await $`pnpm document`
		const cwd = process.cwd()
		const version = JSON.parse((await fs.readFile("package.json")).toString("utf-8")).version
		const versionPrefix = ["v", major(version)].join("")
		const generatedDocs = path.join(cwd, "docs")
		const apiContent = path.join(cwd, "../../apps/documentation/src/content/api", versionPrefix, path.basename(cwd))
		fs.cpSync(generatedDocs, apiContent, { recursive: true, force: true })
	},
})

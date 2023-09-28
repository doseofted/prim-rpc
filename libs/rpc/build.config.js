// @ts-check
import { defineConfig } from "tsup"
import { $, fs, path } from "zx"
import { major } from "semver"

const banner = `
// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0`.replace(/^\n/g, "")

export default defineConfig({
	entry: ["src/index.ts"],
	target: "es2020",
	format: ["esm"],
	dts: true,
	clean: true,
	banner: { js: banner },
	async onSuccess() {
		// await $`pnpm document`
		await $`pnpm document-md`
		const packageJson = JSON.parse((await fs.readFile("package.json")).toString("utf-8"))
		const versionPrefix = "v" + major(packageJson.version)
		const rpcFolder = process.cwd()
		const docsGeneratedFolder = path.join(rpcFolder, "docs")
		const documentationFolder = path.join(rpcFolder, "../../apps/documentation")
		const documentationApiFolder = path.join(documentationFolder, "src/content/api/rpc", versionPrefix)
		fs.cpSync(docsGeneratedFolder, documentationApiFolder, { recursive: true, force: true })
	},
})

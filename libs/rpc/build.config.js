// @ts-check
import { defineConfig } from "tsup"
import { $ } from "zx"

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
		await $`pnpm document`
	},
})

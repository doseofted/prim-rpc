// @ts-check
import { defineConfig } from "tsup"

const banner = `
// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0`.replace(/^\n/g, "")

export default defineConfig({
	entry: ["src/docs/index.ts", "src/build/index.ts", "src/cli/index.ts"],
	target: "es2020",
	format: ["esm"],
	dts: true,
	clean: true,
	banner: { js: banner },
})

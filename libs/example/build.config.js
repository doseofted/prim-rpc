// @ts-check
import { defineBuildConfig } from "unbuild"
import { $ } from "zx"

export default defineBuildConfig({
	hooks: {
		"build:done": async () => {
			await $`pnpm document`
		},
	},
})

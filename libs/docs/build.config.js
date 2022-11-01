// @ts-check
import { defineBuildConfig } from "unbuild"

export default defineBuildConfig({
	externals: ["json-schema"],
	/* hooks: {
		"build:done": (ctx) => {
			console.log(ctx)
		},
	}, */
})

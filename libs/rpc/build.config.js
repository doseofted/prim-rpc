// @ts-check
import { defineBuildConfig } from "unbuild"

export default defineBuildConfig({
	externals: ["type-fest", "lodash-es"],
	/* hooks: {
		"build:done": (ctx) => {
			console.log(ctx)
		},
	}, */
})

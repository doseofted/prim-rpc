import defu from "defu"
import base from "../../uno.config.mjs"
import { defineConfig } from "unocss"

const config = defineConfig({
	theme: {
		fontFamily: {
			sans: ['"Plus Jakarta Sans"', "sans-serif"],
			title: ["Montserrat", "sans-serif"],
		},
		colors: {
			prim: {
				space: "#2D0D60",
			},
		},
	},
})

export default defu(base, config)

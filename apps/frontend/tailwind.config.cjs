const { fontFamily } = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
	theme: {
		extend: {
			fontFamily: {
				sans: ["var(--font-jakarta)", ...fontFamily.sans],
				title: ["var(--font-montserrat)", ...fontFamily.sans],
				mono: ["var(--font-fira)", ...fontFamily.mono],
			},
			colors: {
				prim: {
					space: "#2D0D60",
				},
			},
		},
	},
	plugins: [
		require("daisyui"),
		require("@tailwindcss/typography"),
		require("@tailwindcss/aspect-ratio"),
		require("@tailwindcss/forms"),
		require("@tailwindcss/line-clamp"),
	],
}

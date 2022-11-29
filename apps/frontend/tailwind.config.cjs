const { fontFamily } = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			fontFamily: {
				sans: ["var(--font-jakarta)", ...fontFamily.sans],
				title: ["var(--font-montserrat)", ...fontFamily.sans],
			},
			colors: {
				prim: {
					space: "#2D0D60",
				},
			},
		},
	},
	plugins: [require("daisyui"), require("@tailwindcss/typography")],
}

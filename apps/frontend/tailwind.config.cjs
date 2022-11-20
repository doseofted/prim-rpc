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
		},
	},
	plugins: [require("daisyui"), require("@tailwindcss/typography")],
}

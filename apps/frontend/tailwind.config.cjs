const { fontFamily } = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./app/**/*.{js,ts,jsx,tsx}", "./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			fontFamily: {
				sans: ["var(--font-jakarta)", ...fontFamily.sans],
				title: ["var(--font-montserrat", ...fontFamily.sans],
			},
		},
	},
	plugins: [require("daisyui"), require("@tailwindcss/typography")],
}

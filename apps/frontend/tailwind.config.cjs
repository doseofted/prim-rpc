const { fontFamily } = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
	],
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
	daisyui: {
		themes: [
			{
				// Prim color scheme base
				// LINK https://coolors.co/f0a3ff-6d53ff-1d0049-0069ba-5bb8ff-4aedff
				// with semantic palette based on base color scheme
				// LINK https://coolors.co/5bb8ff-ffd670-ff9770-ff70a6-47ec97
				prim: {
					primary: "#F0A3FF",
					secondary: "#6D53FF",
					accent: "#0069BA",
					neutral: "#1D0049",
					"base-100": "#ffffff",
					info: "#5bb8ff",
					success: "#47EC97",
					warning: "#FFD670",
					error: "#FF9770",
				},
			},
		],
	},
	plugins: [
		require("daisyui"),
		require("@tailwindcss/typography"),
		require("@tailwindcss/aspect-ratio"),
		require("@tailwindcss/forms"),
	],
}

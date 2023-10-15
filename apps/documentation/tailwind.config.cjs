// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fontFamily } = require("tailwindcss/defaultTheme")

// Prim color scheme base
// LINK https://coolors.co/f0a3ff-6d53ff-1d0049-0069ba-5bb8ff-4aedff
// with semantic palette based on base color scheme
// LINK https://coolors.co/5bb8ff-ffd670-ff9770-ff70a6-47ec97
const daisyThemeOverrides = {
	primary: "#F0A3FF",
	secondary: "#6D53FF",
	accent: "#0069BA",
	neutral: "#1D0049",
	"base-100": "#ffffff",
	info: "#5bb8ff",
	success: "#47EC97",
	warning: "#FFD670",
	error: "#FF9770",
}

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
	theme: {
		extend: {
			fontFamily: {
				sans: ["'Plus Jakarta Sans Variable'", ...fontFamily.sans],
				title: ["Montserrat Variable", ...fontFamily.sans],
				mono: ["'Fira Code Variable'", ...fontFamily.mono],
			},
			colors: {
				prim: {
					space: "#2D0D60",
					...daisyThemeOverrides,
				},
			},
		},
	},
	daisyui: {
		themes: [
			{
				prim: daisyThemeOverrides,
			},
		],
	},
	plugins: [require("daisyui"), require("@tailwindcss/typography") /* require("@tailwindcss/forms") */],
}

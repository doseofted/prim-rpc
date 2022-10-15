/** @type {import("@builder.io/mitosis").MitosisConfig}} */
const typescript = true
const config = {
	files: "src/**",
	targets: ["vue3", "solid", "svelte", "react"],
	dest: "./output",
	options: {
		vue3: {
			api: "composition",
			typescript,
		},
		solid: {
			typescript,
		},
		svelte: {
			typescript,
		},
		react: {
			typescript,
		},
	},
}

module.exports = config

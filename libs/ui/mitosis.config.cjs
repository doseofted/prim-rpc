/** @type {import("@builder.io/mitosis").MitosisConfig} */
module.exports = {
	files: "src/components/**",
	targets: ["vue", "svelte", "react"],
	dest: "src/generated",
	options: {
		vue: { typescript: true, api: "options" },
		svelte: { typescript: true },
		react: { typescript: true },
	},
}

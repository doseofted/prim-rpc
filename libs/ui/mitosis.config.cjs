/** @type {import("@builder.io/mitosis").MitosisConfig} */
module.exports = {
	files: "src/**",
	targets: ["vue3", "svelte", "react"],
	dest: "generated",
	options: {
		vue3: { typescript: true },
		svelte: { typescript: true },
		react: { typescript: true },
	},
}

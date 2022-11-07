/** @type {import("@builder.io/mitosis").MitosisConfig} */
module.exports = {
	files: "src/components/**",
	targets: ["vue3", "svelte", "react"],
	dest: "src/generated",
	options: {
		vue3: { typescript: true },
		svelte: { typescript: true },
		react: { typescript: true },
	},
}

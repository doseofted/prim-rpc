/** @type {import("@builder.io/mitosis").MitosisConfig} */
module.exports = {
	files: "src/components/**",
	targets: ["react", "vue3" /* "svelte" */],
	dest: "src/generated",
	options: {
		react: { typescript: true },
		vue3: { typescript: true, api: "options" },
		// svelte: { typescript: true },
	},
}

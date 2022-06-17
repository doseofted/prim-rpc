module.exports = {
	root: false,
	// LINK https://eslint.vuejs.org/user-guide/#how-to-use-a-custom-parser
	parser: "vue-eslint-parser",
	parserOptions: {
		parser: "@typescript-eslint/parser",
		sourceType: "module",
	},
	plugins: [
		"@typescript-eslint",
	],
	// LINK https://eslint.vuejs.org/user-guide/#bundle-configurations
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:vue/vue3-recommended",
	],
	env: {
		"browser": true,
	},
}

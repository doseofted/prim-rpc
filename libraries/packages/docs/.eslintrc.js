module.exports = {
	root: false,
	parser: "vue-eslint-parser",
	parserOptions: {
		parser: "@typescript-eslint/parser",
		sourceType: "module"
	},
	plugins: [
		"@typescript-eslint",
	],
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:vue/vue3-recommended"
	],
	env: {
		"browser": true,
		"vue/setup-compiler-macros": true
	}
}

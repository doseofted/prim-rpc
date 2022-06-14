module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	plugins: [
		"@typescript-eslint",
	],
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
	],
	env: {
		"node": true
	},
	rules: {
		// https://typescript-eslint.io/rules/quotes
		"quotes": "off",
		"@typescript-eslint/quotes": ["error", "double"],
		// https://typescript-eslint.io/rules/indent
		"indent": "off",
		"@typescript-eslint/indent": ["error", "tab"],
		"no-unused-vars": "off",
		"@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
	},
}

/** @type {import("eslint").ESLint.ConfigData} */
module.exports = {
	root: false,
	overrides: [{
		files: ["*.ts", "*.tsx"],
		// LINK https://eslint.vuejs.org/user-guide/#how-to-use-a-custom-parser
		parser: "@typescript-eslint/parser",
		parserOptions: {
			sourceType: "module",
		},
		plugins: [
			"@typescript-eslint",
			"solid",
		],
		// LINK https://eslint.vuejs.org/user-guide/#bundle-configurations
		extends: [
			"eslint:recommended",
			"plugin:@typescript-eslint/recommended",
			"plugin:solid/typescript",
		],
		env: {
			"browser": true,
		},
	}],
}

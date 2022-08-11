/** @type {import("eslint").ESLint.ConfigData} */
module.exports = {
	root: false,
	overrides: [{
		files: ["*.ts", "*.tsx"],
		parser: "@typescript-eslint/parser",
		parserOptions: {
			sourceType: "module",
		},
		plugins: [
			"@typescript-eslint",
			"solid",
		],
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

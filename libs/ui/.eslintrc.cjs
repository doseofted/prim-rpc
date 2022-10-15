/** @type {import("eslint").ESLint.ConfigData} */
module.exports = {
	root: false,
	overrides: [
		{
			files: ["*.ts", "*.tsx"],
			parser: "@typescript-eslint/parser",
			parserOptions: {
				sourceType: "module",
				ecmaFeatures: {
					jsx: true,
				},
				project: "./libs/ui/tsconfig.json",
			},
			plugins: [
				"@typescript-eslint",
				"solid",
				"@builder.io/mitosis",
			],
			extends: [
				"eslint:recommended",
				"plugin:@typescript-eslint/recommended",
				"plugin:solid/typescript",
				"plugin:@builder.io/mitosis/recommended",
			],
			env: {
				"browser": true,
			},
		},
		{
			files: ["*.tsx"],
			rules: {
			// NOTE: this is a workaround until I find out how to let ESLint know JSX element's return types
				"@typescript-eslint/no-unsafe-return": "off",
			},
		},
	],
}

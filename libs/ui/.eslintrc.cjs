/** @type {import("eslint").ESLint.ConfigData} */
module.exports = {
	root: false,
	overrides: [
		{
			files: ["*.ts", "*.tsx"],
			excludedFiles: ["*.lite.tsx"],
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
			],
			extends: [
				"eslint:recommended",
				"plugin:@typescript-eslint/recommended",
				// "plugin:solid/typescript",
				"plugin:react/recommended",
				"plugin:react-hooks/recommended",
			],
			env: {
				"browser": true,
			},
			rules: {
				"react/react-in-jsx-scope": ["off"],
			},
		},
		{
			files: ["*.lite.tsx"],
			plugins: ["@builder.io/mitosis"],
			extends: [
				// Use this approach for our recommended rules configuration
				"plugin:@builder.io/mitosis/recommended",
			],
		},
	],
}

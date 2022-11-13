// @ts-check
/** @type {import("eslint").ESLint.ConfigData} */
const config = {
	root: false,
	overrides: [
		{
			files: ["*.tsx"],
			excludedFiles: ["*.lite.tsx"],
			parser: "@typescript-eslint/parser",
			plugins: ["@typescript-eslint"],
			parserOptions: {
				sourceType: "module",
				project: ["./libs/ui/tsconfig.json"],
				ecmaFeatures: {
					jsx: true,
				},
			},
			extends: [
				"eslint:recommended",
				"plugin:@typescript-eslint/recommended",
				"plugin:@typescript-eslint/recommended-requiring-type-checking",
				"plugin:react/recommended",
				"plugin:react-hooks/recommended",
				"prettier",
			],
		},
		{
			parser: "@typescript-eslint/parser",
			parserOptions: {
				sourceType: "module",
				project: ["./libs/ui/tsconfig.json"],
				ecmaFeatures: {
					jsx: true,
				},
			},
			files: ["*.lite.tsx"],
			plugins: ["@builder.io/mitosis"],
			extends: [
				"eslint:recommended",
				"plugin:@typescript-eslint/recommended",
				"plugin:@typescript-eslint/recommended-requiring-type-checking",
				"plugin:@builder.io/mitosis/recommended",
				"prettier",
			],
		},
	],
}

module.exports = config

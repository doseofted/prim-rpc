// @ts-check
/** @type {import("eslint").ESLint.ConfigData} */
const config = {
	root: false,
	overrides: [
		{
			files: ["*react.tsx"],
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
				"plugin:react/jsx-runtime",
				"prettier",
			],
		},
		{
			files: ["*.vue"],
			parser: "vue-eslint-parser",
			parserOptions: {
				parser: "@typescript-eslint/parser",
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
				"plugin:vue/vue3-recommended",
				"prettier",
			],
		},
	],
}

module.exports = config

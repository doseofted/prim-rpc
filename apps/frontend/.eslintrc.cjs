// @ts-check
/** @type {import("eslint").ESLint.ConfigData} */
const config = {
	root: false,
	// "extends": ["plugin:@next/next/recommended", "prettier"],
	overrides: [
		{
			files: ["*.tsx"],
			excludedFiles: ["*.lite.tsx"],
			parser: "@typescript-eslint/parser",
			plugins: ["@typescript-eslint"],
			parserOptions: {
				sourceType: "module",
				project: ["./tsconfig.json"],
				ecmaFeatures: {
					jsx: true,
				},
			},
			extends: [
				"eslint:recommended",
				"plugin:@typescript-eslint/recommended",
				"plugin:@typescript-eslint/recommended-requiring-type-checking",
				"plugin:@next/next/recommended",
				"prettier",
				"next/core-web-vitals",
			],
			rules: {
				"@next/next/no-html-link-for-pages": ["error", "src/pages/"],
			},
		},
	],
	settings: {
		next: {
			rootDir: "apps/frontend",
		},
	},
}

module.exports = config

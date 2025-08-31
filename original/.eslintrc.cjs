// @ts-check
/** @type {import("eslint").ESLint.ConfigData} */
module.exports = {
	root: true,
	extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended-type-checked", "prettier"],
	plugins: ["@typescript-eslint"],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: true,
		tsconfigRootDir: __dirname,
		// Needed for tsconfig project references
		EXPERIMENTAL_useSourceOfProjectReferenceRedirect: true,
	},
	overrides: [
		{
			files: ["*.js", "*.cjs"],
			extends: ["plugin:@typescript-eslint/disable-type-checked"],
		},
	],
	env: {
		browser: true,
		node: true,
		es2023: true,
	},
	ignorePatterns: [".eslintrc.*", "dist/", "/data/"],
	globals: {},
	rules: {
		"@typescript-eslint/no-unused-vars": [
			"warn",
			{
				argsIgnorePattern: "^_",
				varsIgnorePattern: "^_",
			},
		],
		"@typescript-eslint/no-misused-promises": ["warn", { checksVoidReturn: false }],
	},
}

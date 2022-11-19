// @ts-check
/** @type {import("eslint").ESLint.ConfigData} */
const config = {
	root: true,
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
		ecmaFeatures: {
			jsx: true,
		},
	},
	env: {
		browser: true,
		es2021: true,
		node: true,
	},
	overrides: [
		{
			files: ["*.js", "*.jsx", "*.mjs", "*.cjs"],
			extends: ["eslint:recommended", "prettier"],
			rules: {
				"no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
			},
		},
		{
			files: ["*.ts", "*.tsx", "*.cts", "*.mts"],
			parser: "@typescript-eslint/parser",
			plugins: ["@typescript-eslint"],
			parserOptions: {
				tsconfigRootDir: __dirname,
				sourceType: "module",
				project: ["./tsconfig.json", "./libs/**/tsconfig.json", "./apps/**/tsconfig.json"],
				ecmaFeatures: {
					jsx: true,
				},
			},
			extends: [
				"eslint:recommended",
				"plugin:@typescript-eslint/recommended",
				"plugin:@typescript-eslint/recommended-requiring-type-checking",
				"prettier",
			],
			rules: {
				"no-unused-vars": ["off"],
				"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
			},
		},
	],
}
// Run command below to see final config
// DEBUG_CONFIG=true node .eslintrc.cjs | jq
if (process.env.DEBUG_CONFIG) {
	console.log(JSON.stringify(config, null, "  "))
}
module.exports = config

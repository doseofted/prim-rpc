/** Disable ESLint rule and enable TypeScript-ESLint version instead as long as `js` argument is `false`. */
const withBaseRule = (name, opts, js = false) => (js ? { [name]: opts } : {
	[name]: "off",
	[`@typescript-eslint/${name}`]: opts,
})
/** Given rule, return tuple with ESLint rule first, then TypeScript-ESLint version */
const rule = (name, opts) => [withBaseRule(name, opts, true), withBaseRule(name, opts)]
const rules = (() => {
	let typescript = {}; let javascript = {}
	void [
		// LINK https://typescript-eslint.io/rules/brace-style/
		rule("brace-style", ["error", "1tbs", { "allowSingleLine": true }]),
		// LINK https://typescript-eslint.io/rules/indent
		rule("indent", ["error", "tab"]),
		// LINK https://typescript-eslint.io/rules/quotes
		rule("quotes", ["error", "double"]),
		// LINK https://typescript-eslint.io/rules/comma-dangle
		rule("comma-dangle", ["error", "always-multiline"]),
		// LINK https://typescript-eslint.io/rules/require-await
		rule("require-await", ["off"]),
		// LINK https://typescript-eslint.io/rules/semi
		rule("semi", ["error", "never"]),
	].forEach(([js, ts]) => {
		javascript = { ...javascript, ...js }; typescript = { ...typescript, ...ts }
	})
	return { typescript, javascript }
})()

module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	plugins: ["@typescript-eslint"],
	extends: [
		"eslint:recommended",
	],
	rules: {
		...rules.javascript,
	},
	env: {
		"node": true,
	},
	overrides: [
		{
			files: ["*.ts", "*.tsx"],
			parserOptions: {
				tsconfigRootDir: __dirname,
				project: [
					"./tsconfig.json",
					"./libs/*/tsconfig.json",
				],
			},
			extends: [
				"eslint:recommended",
				"plugin:@typescript-eslint/recommended",
				"plugin:@typescript-eslint/recommended-requiring-type-checking",
			],
			rules: {
				...rules.typescript,
			},
		},
	],
}

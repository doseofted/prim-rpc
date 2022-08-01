/** @type {import("ts-jest").InitialOptionsTsJest} */
module.exports = {
	// LINK https://jestjs.io/docs/next/configuration#testenvironment-string
	testEnvironment: "node",
	// LINK https://kulshekhar.github.io/ts-jest/docs/getting-started/presets
	preset: "ts-jest/presets/default-esm",
	// LINK https://stackoverflow.com/a/54117206
	extensionsToTreatAsEsm: [".ts"],
	globals: {
		"ts-jest": {
			useESM: true,
		},
	},
	transform: {},
}

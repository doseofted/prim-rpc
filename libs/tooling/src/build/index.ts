// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { createUnplugin } from "unplugin"

export enum BuildModifyMethod {
	/**
	 * Replace all code in given directory with an empty export for each file:
	 *
	 * ```typescript
	 * export {};
	 * ```
	 */
	BuildTimeEmptyExport = "build-time-empty-export",
	/**
	 * Add a runtime check to prevent imports from being used on the client.
	 * While this does not prevent the import from being bundled, it should flag
	 * an error in your testing process so that you can take action.
	 *
	 * The following will be added to the top of each file:
	 *
	 * ```typescript
	 * if (!process.server) { throw new Error("YOUR MESSAGE"); }
	 * ```
	 */
	RunTimeProcessCheck = "run-time-process-check",
	/**
	 * This is the same option as "run-time-process-check" except instead of checking
	 * the `process` object, it checks that the `window` object isn't undefined.
	 *
	 * See `"run-time-process-check"` for more details.
	 */
	RunTimeWindowCheck = "run-time-window-check",
}

export interface BuildOptions {
	/** Folder name, relative to project folder that should not be imported */
	name: string
	/** Enable console logs for imports to determine what name option should be used */
	debug?: boolean
	/** If a given `.method` is a run-time check, what message should be given to created Error? */
	runtimeError?: string
	/**
	 * Specify method of preventing import.
	 * Methods are prefixed "build-time-" to prevent code from being bundled
	 * or "run-time-" to prevent code from being used (but still bundled).
	 */
	method?: BuildModifyMethod
}

const pluginDefaults = {
	name: "",
	method: BuildModifyMethod.BuildTimeEmptyExport,
	runtimeError: "Prim+RPC cannot be started.",
	debug: false,
}

export default createUnplugin((options: BuildOptions) => {
	const configured = { ...pluginDefaults, ...options }
	return {
		name: "unplugin-prim-prevent-import",
		transformInclude: id => {
			const matches = id.startsWith(configured.name)
			if (configured.debug) console.log((matches ? "match:" : "no match:").padEnd(10), id)
			return matches
		},
		transform: (originalCode, _id) => {
			let code: string = null
			switch (configured.method) {
				case BuildModifyMethod.RunTimeProcessCheck: {
					code = `if (!process.server) { throw new Error(${JSON.stringify(
						configured.runtimeError
					)}); }\n\n${originalCode}`
					break
				}
				case BuildModifyMethod.RunTimeWindowCheck: {
					code = `if (typeof window !== "undefined") { throw new Error(${JSON.stringify(
						configured.runtimeError
					)}); }\n\n${originalCode}`
					break
				}
				case BuildModifyMethod.BuildTimeEmptyExport:
				default: {
					code = "export {};"
					break
				}
			}
			return { code }
		},
	}
})

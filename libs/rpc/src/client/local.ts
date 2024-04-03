// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { givenFormLike, handlePossibleForm } from "../extract/blobs"
import type { PossibleModule } from "../interfaces"
import type { UserProvidedClientOptions } from "../options/client/provided"
import type { RpcCall } from "../types/rpc-structure"
import { handlePotentialPromise } from "./wrapper"
import getProperty from "just-safe-get"

/**
 * Provided module is either:
 *
 * - not provided
 * - some provided module
 * - a dynamic import of a module
 * - a function that returns a dynamic import containing the module
 * - a function that returns the module (unnecessary but supported)
 *
 * This function removes the function wrapper and returns the module if provided, otherwise `null`.
 *
 * **This does not remove any Promise wrappers.** That should be handled in another step (consider using the
 * `handlePotentialPromise()` utility)
 */
export function getUnfulfilledModule(
	moduleMaybe: undefined | null | object | (() => Promise<object>) | (() => object) | Promise<object>
): null | object | Promise<object> | Promise<null> {
	if (typeof moduleMaybe === "function") {
		const moduleMaybeDynamicImport = moduleMaybe() as Promise<object> | object
		if (moduleMaybeDynamicImport instanceof Promise) return moduleMaybeDynamicImport.then(given => given ?? null)
		return moduleMaybeDynamicImport ?? null
	}
	if (moduleMaybe instanceof Promise) return moduleMaybe.then(given => given ?? null)
	return moduleMaybe ?? null
}

/**
 * Given an `rpc` call, check if a local module has been provided in the `options` and if the method in the RPC exists
 * on it. Optionally, pass a `nextToken` (a symbol) to be returned if the method does not exist. This symbol will be
 * returned if a return value is not given.
 *
 * **Important:** The `nextToken` will be wrapped in a Promise if the module is a dynamic import.
 */
export function handleLocalModuleMethod(
	rpc: RpcCall<string, unknown[]>,
	options: UserProvidedClientOptions<PossibleModule>,
	nextToken?: symbol
) {
	const providedModule = getUnfulfilledModule(options.module)
	return handlePotentialPromise(
		providedModule,
		providedModule => {
			if (!providedModule) return nextToken
			const method = getProperty(providedModule, rpc.method) as (...args: unknown[]) => unknown
			if (method) {
				const preprocessed = options.preRequest?.(rpc.args, rpc.method) || { args: rpc.args }
				if (options.handleForms && "args" in preprocessed && givenFormLike(preprocessed.args[0])) {
					preprocessed.args[0] = handlePossibleForm(preprocessed.args[0])
				}
				if ("result" in preprocessed) {
					return options.postRequest?.(preprocessed.args, preprocessed.result, rpc.method) ?? preprocessed.result
				}
				const result = method(...preprocessed.args)
				return options.postRequest?.(preprocessed.args, result, rpc.method) ?? result
			}
			return nextToken
		},
		error => {
			const processedError = options.onError?.(error, rpc.method) ?? error
			throw processedError
		}
	)
}

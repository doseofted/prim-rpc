import { givenFormLike, handlePossibleForm } from "../extract/blobs"
import type { AnyFunction, PossibleModule, PrimOptions, RpcCall } from "../interfaces"
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
 * This function removes the function wrapper and provides a fallback to an empty object if not defined.
 *
 * **This does not remove any Promise wrappers.** That should be handled in another step.
 */
export function getUnfulfilledModule(
	moduleMaybe: undefined | null | object | (() => Promise<object>) | (() => object) | Promise<object>
): object | Promise<object> {
	if (typeof moduleMaybe === "function") {
		const moduleMaybeDynamicImport = moduleMaybe() as Promise<object> | object
		if (moduleMaybeDynamicImport instanceof Promise) return moduleMaybeDynamicImport.then(given => given ?? {})
		return moduleMaybeDynamicImport ?? {}
	}
	if (moduleMaybe instanceof Promise) return moduleMaybe.then(given => given ?? {})
	return moduleMaybe ?? {}
}

/**
 * Given an `rpc` call, check if a local module has been provided in the `options` and if the method in the RPC exists
 * on it. Optionally, pass a `nextToken` (a symbol) to be returned if the method does not exist. This symbol will be
 * returned if a return value is not given.
 *
 * **Important:** The `nextToken` will be wrapped in a Promise if the module is a dynamic import.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleLocalModule(rpc: RpcCall<string, unknown[]>, options: PrimOptions<any, any>, nextToken?: symbol) {
	if (!options.module) return nextToken
	const providedModule = getUnfulfilledModule(options.module as PossibleModule)
	return handlePotentialPromise(providedModule, providedModule => {
		if (!providedModule) return nextToken
		const method = getProperty(providedModule, rpc.method) as AnyFunction
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		if (method) {
			const preprocessed = options.preRequest?.(rpc.args, rpc.method) ?? { args: rpc.args }
			if (options.handleForms && Array.isArray(preprocessed.args) && givenFormLike(preprocessed.args[0])) {
				preprocessed.args[0] = handlePossibleForm(preprocessed.args[0])
			}
			if ("result" in preprocessed) {
				return options.postRequest?.(preprocessed.result, rpc.method) ?? preprocessed.result
			}
			const result = method(...preprocessed.args) as unknown
			return options.postRequest?.(result, rpc.method) ?? result
		}
		return nextToken
	})
}

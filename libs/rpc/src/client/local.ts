import { givenFormLike, handlePossibleForm } from "../extract/blobs"
import type { AnyFunction, JsonHandler, PossibleModule, PrimOptions, RpcCall } from "../interfaces"
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
	options: PrimOptions<PossibleModule, JsonHandler>,
	nextToken?: symbol
) {
	const providedModule = getUnfulfilledModule(options.module)
	return handlePotentialPromise(providedModule, providedModule => {
		if (!providedModule) return nextToken
		const method = getProperty(providedModule, rpc.method) as AnyFunction
		if (method) {
			const preprocessed = options.preRequest?.(rpc.args, rpc.method) || { args: rpc.args }
			if (options.handleForms && Array.isArray(preprocessed.args) && givenFormLike(preprocessed.args[0])) {
				preprocessed.args[0] = handlePossibleForm(preprocessed.args[0])
			}
			if ("result" in preprocessed) {
				return options.postRequest?.(preprocessed.args, preprocessed.result, rpc.method) ?? preprocessed.result
			}
			const result = method(...preprocessed.args) as unknown
			return options.postRequest?.(preprocessed.args, result, rpc.method) ?? result
		}
		return nextToken
	})
}

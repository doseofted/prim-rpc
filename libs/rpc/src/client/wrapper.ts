// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

/** The default behavior upon receiving an error in `handlePotentialPromise()` is to rethrow that error */
function defaultError(error: unknown) {
	throw error
}

/**
 * Given a function that returns object `T` or `Promise<T>`, act on `T` in the
 * provided `handler` which should return some value `R` back, which will become
 * the final return value of this function, wrapped as `Promise<R>` if given
 * `Promise<T>`. If an error is thrown, it will be caught and will rethrow if
 * behavior is not overridden in given `error` handler.
 *
 * While more verbose, this is useful when logic needs to remain synchronous
 * because the final result may not always be a Promise. This function also
 * makes this pattern play nicer with TypeScript.
 *
 * @example
 * ```ts
 * import staticImport from "./hello"
 * const dynamicImport = import("./hello")
 *
 * // without (it must be known whether promise is or isn't given)
 * const same = dynamicImport.then(dynamicImport => {
 *   const a = dynamicImport.hello()
 *   const b = staticImport.hello()
 *   return a === b
 * })
 * same.then(console.log) // true
 * // with (function handles both cases)
 * const same = handlePotentialPromise(() => dynamicImport, dynamicImport => {
 *   const a = dynamicImport.hello()
 *   return handlePotentialPromise(() => staticImport, staticImport => {
 *     const b = staticImport.hello()
 *     return a === b
 *   })
 * })
 * handlePotentialPromise(() => same, console.log) // true
 * ```
 */
export function handlePotentialPromise<
	Given,
	Returned,
	GivenResolved = Given extends Promise<infer Resolved> ? Resolved : Given,
	ReturnedResolved = Returned extends Promise<infer Resolved> ? Resolved : Returned,
	ReturnedFinal = Given extends Promise<infer _>
		? Promise<ReturnedResolved>
		: Returned extends Promise<infer _>
			? Promise<ReturnedResolved>
			: Returned,
>(given: () => Given, handler: (value: GivenResolved) => Returned, error = defaultError): ReturnedFinal {
	try {
		const result = given()
		if (result instanceof Promise) return result.then(handler).catch(error) as ReturnedFinal
		return handler(result as unknown as GivenResolved) as unknown as ReturnedFinal
	} catch (errorGiven) {
		error(errorGiven)
	}
}

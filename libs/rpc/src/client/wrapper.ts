// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

/** The default behavior upon receiving an error in `handlePotentialPromise()` is to rethrow that error */
function defaultError(error: unknown) {
	throw error
}

/**
 * Given object `T` or `Promise<T>`, act on `T` in the
 * provided `handler` which should return some value `R` back, which will become
 * the final return value of this function, wrapped as `Promise<R>` if given
 * `Promise<T>`. If an error is thrown, it will be caught and will rethrow if
 * behavior is not overridden in given `error` handler.
 *
 * This is useful when logic needs to remain synchronous because the final
 * result may not always be a Promise. This function also makes this pattern
 * play nicer with TypeScript.
 *
 * @example
 * ```ts
 * import staticImport from "./hello"
 * const dynamicImport = import("./hello")
 *
 * const useCacheIfAvailable = true
 * function hello(imported) {
 *   return handlePotentialPromise(imported, imported => {
 *     const greeting = imported.fetchHello(useCacheIfAvailable)
 *     return handlePotentialPromise(greeting, greeting => {
 *       return `${greeting} Testing!`
 *     })
 *   })
 * }
 *
 * hello(dynamicImport).then(console.log) // "Hello Testing!"
 * console.log(hello(staticImport)) // "Hello Testing!"
 * // -- or --
 * handlePotentialPromise(hello(dynamicImport), console.log) // "Hello Testing!"
 * handlePotentialPromise(hello(staticImport), console.log) // "Hello Testing!"
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
>(given: Given, handler: (value: GivenResolved) => Returned, error = defaultError): ReturnedFinal {
	if (given instanceof Promise) {
		return given.then(handler).catch(error) as ReturnedFinal
	}
	try {
		return handler(given as unknown as GivenResolved) as unknown as ReturnedFinal
	} catch (errorGiven) {
		error(errorGiven)
	}
}

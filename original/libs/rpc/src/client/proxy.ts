// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { DeepProxy } from "proxy-deep"
import { nanoid } from "nanoid"
import type { RpcCall, RpcChain } from "../types/rpc-structure"

/** Determine if given property name is one of a Promise, with type guard */
function isPromiseMethodName(given: PropertyKey): given is "then" | "catch" | "finally" {
	return ["then", "catch", "finally"].includes(given.toString())
}

/** Determine if given property belongs to an iterable */
function isIterablePropertyName(
	given: PropertyKey
): given is "next" | "return" | "throw" | typeof Symbol.iterator | typeof Symbol.asyncIterator {
	return ["next", "return", "throw", Symbol.iterator, Symbol.asyncIterator].includes(given as string | symbol)
}

/**
 * Prim+RPC expects a root RPC call to be given with an optional chain.
 *
 * Given a chain of RPCs, convert it to a single root RPC with a chain of additional RPCs.
 */
function convertChainToRpcStructure(chain: RpcChain[], withId = false) {
	if (!Array.isArray(chain)) null
	if (chain.length === 0) return null
	const { method, args } = chain.slice().shift() as RpcChain<string, unknown[]>
	const rpc: RpcCall<string, unknown[]> = { method, args }
	if (withId) rpc.id = nanoid()
	if (chain.length > 1) rpc.chain = chain.slice(1)
	return rpc
}

interface MethodCatcherOptions {
	/**
	 * Specify an existing RPC chain when using two instances of
	 * `createMethodCatcher` together (used internally during recursion)
	 */
	chain?: RpcChain[]
	/**
	 * Called on each method call of a given chain.
	 * Return `next` symbol to continue, return anything else to end chain and return
	 */
	onMethod?: (rpc: RpcCall<string, unknown[]>, next: symbol) => unknown
	/**
	 * Called when a `Promise` method (`then`, `catch`, or `finally`) is called on
	 * given chain. Return `next` symbol to continue, return value to become the
	 * resolved promise or return a promise itself.
	 */
	onAwaited?: (rpc: RpcCall<string, unknown[]>, next: symbol) => unknown
	/**
	 * Called when an iterable method `next` is called.
	 * Return `next` symbol to continue, return an iterable iterator (a called
	 * generator function) to return the expected (a)sync iterator.
	 */
	onIterable?: (rpc: RpcCall<string, unknown[]>, next: symbol) => unknown
}

/**
 * Creates a recursive Proxy that captures property access and method calls and
 * records them to a final RPC object, including method chaining.
 *
 * Event handlers given in `options` can be used to intercept method calls.
 * By default, a Promise object is used as the Proxy target and calls to `then`,
 * `catch`, and `finally` are intercepted in the `onAwaited` hook. This also
 * means that these method names are not otherwise allowed when this hook is
 * provided.
 *
 * It's generally expected that a `Promise` will be returned, however by using
 * the `onMethod` hook, you can return any value synchronously, if needed. You
 * can also catch calls to an iterator by using the `onIterable` hook. When an
 * iterable hook is given, `next`, `return`, and `throw` methods are intercepted
 * and cannot be used as method names.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMethodCatcher<ModuleType extends object = any>(options: MethodCatcherOptions = {}): ModuleType {
	// Essentially, `Promise.withResolvers`
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers#description
	let resolvePromise: (value: unknown) => void
	let rejectPromise: (error: unknown) => void
	const promise = new Promise((resolve, reject) => {
		resolvePromise = resolve
		rejectPromise = reject
	})
	let generator: Generator<unknown> | AsyncGenerator<unknown>
	/** Signal that, when returned from event handler, the return value should be ignored */
	const next = Symbol("next")
	return new DeepProxy(promise, {
		apply(target, thisArg, args: unknown[]) {
			const method = this.path.filter(given => typeof given === "string").join(".")
			const newRpc: RpcChain = { method, args }
			const chain = Array.isArray(options.chain) ? options.chain : []
			chain.push(newRpc)
			if (typeof options.onMethod === "function") {
				const rpc = convertChainToRpcStructure(chain, true)
				const result = options.onMethod(rpc, next)
				if (result !== next) return result
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return createMethodCatcher({ ...options, chain })
		},
		get(_target, p, _receiver) {
			if (typeof options.onAwaited === "function" && isPromiseMethodName(p)) {
				if (resolvePromise && rejectPromise) {
					const rpc = convertChainToRpcStructure(options.chain, true)
					try {
						const result = options.onAwaited(rpc, next)
						if (result !== next) {
							if (result instanceof Promise) {
								result
									.then(result => {
										if (result === next) return
										resolvePromise(result)
										resolvePromise = null
										rejectPromise = null
									})
									.catch(error => {
										rejectPromise(error)
										resolvePromise = null
										rejectPromise = null
									})
							} else {
								resolvePromise(result)
								resolvePromise = null
								rejectPromise = null
							}
						}
					} catch (error) {
						rejectPromise(error)
						resolvePromise = null
						rejectPromise = null
					}
				}
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return promise[p].bind(promise)
			} else if (options.onIterable && isIterablePropertyName(p)) {
				const rpc = convertChainToRpcStructure(options.chain, true)
				const result = generator ?? options.onIterable(rpc, next)
				generator = result as Generator<unknown> | AsyncGenerator<unknown>
				if (result !== next) {
					if (typeof result === "object" && p in result) {
						if (typeof p === "symbol") {
							// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
							return result[p].bind(result) // if given iterator, return as-is since it was directly requested
						} else {
							// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
							return result[p].bind(result)
						}
					} else if (typeof p === "symbol") {
						// ... (considering creating faux generator response with returned value)
						// return (function* () { yield result })()
					}
				}
			}
			return this.nest(() => {})
		},
	}) as ModuleType
}

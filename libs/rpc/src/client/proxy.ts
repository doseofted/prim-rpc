import { DeepProxy } from "proxy-deep"
import { RpcCall } from ".."
import { nanoid } from "nanoid"
import { RpcChain } from "../interfaces"

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
	 * given chain. Return `next` symbol to continue, return anything else to end.
	 */
	onAwaited?: (rpc: RpcCall<string, unknown[]>, next: symbol) => unknown
}
/**
 * Creates a recursive Proxy that captures property access and method calls and
 * records them to a final RPC object, including method chaining.
 *
 * Event handlers given in `options` can be used to intercept method calls.
 * By default, a Promise object is used as the Proxy target and calls to `then`,
 * `catch`, and `finally` are intercepted in the `onAwaited` hook. This also
 * means that these method names are not otherwise allowed.
 *
 * It's generally expected that a `Promise` will be returned, however by using
 * the `onMethod` hook, you can return any value synchronously, if needed.
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
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				if (result === next) return createMethodCatcher({ ...options, chain })
				return result
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
						if (result === next) {
							return this.nest(() => {})
						}
						if (result instanceof Promise) {
							result.then(resolvePromise).catch(rejectPromise)
						} else {
							resolvePromise(result)
						}
					} catch (error) {
						rejectPromise(error)
					}
					resolvePromise = null
					rejectPromise = null
				}
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return promise[p].bind(promise)
			}
			return this.nest(() => {})
		},
	}) as ModuleType
}

function isPromiseMethodName(given: PropertyKey): given is "then" | "catch" | "finally" {
	return ["then", "catch", "finally"].includes(given.toString())
}

/**
 * Prim+RPC expect a root RPC call to be given with an optional chain.
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

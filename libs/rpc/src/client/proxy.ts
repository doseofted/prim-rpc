import { DeepProxy } from "proxy-deep"
import { RpcCall } from ".."
import { nanoid } from "nanoid"
import { RpcChain } from "../interfaces"

function isPromiseMethodName(given: PropertyKey): given is "then" | "catch" | "finally" {
	return ["then", "catch", "finally"].includes(given.toString())
}

interface MethodCatcherOptions {
	chain?: RpcChain[]
}
export function createMethodCatcher(handler: (rpc: RpcCall) => unknown, options: MethodCatcherOptions = {}) {
	// Essentially, `Promise.withResolvers`
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers#description
	let resolvePromise: (value: unknown) => void
	let rejectPromise: (error: unknown) => void
	const promise = new Promise((resolve, reject) => {
		resolvePromise = resolve
		rejectPromise = reject
	})
	return new DeepProxy(promise, {
		apply(target, thisArg, args: unknown[]) {
			// const lastPath = this.path[this.path.length - 1]
			// if (isPromiseMethodName(lastPath)) {
			// 	if (!Array.isArray(options.chain)) return resolvePromise(null)
			// 	if (options.chain.length === 0) return resolvePromise(null)
			// 	const chainLength = options.chain.length
			// 	const { method, args } = options.chain.shift() as RpcChain<string, unknown[]>
			// 	const rpc: RpcCall = { id: nanoid(), method, args }
			// 	if (chainLength > 1) rpc.chain = options.chain
			// 	try {
			// 		const result = handler(rpc)
			// 		if (result instanceof Promise) {
			// 			result.then(resolvePromise).catch(rejectPromise)
			// 		} else {
			// 			resolvePromise(result)
			// 		}
			// 	} catch (error) {
			// 		rejectPromise(error)
			// 	}
			// 	// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
			// 	const result = promise[lastPath].bind(promise)?.()
			// 	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			// 	return result
			// }
			const method = this.path.join(".")
			const rpc: RpcChain = { method, args }
			const chain = Array.isArray(options.chain) ? options.chain : []
			chain.push(rpc)
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return createMethodCatcher(handler, { ...options, chain })
		},
		get(_target, p, _receiver) {
			if (isPromiseMethodName(p)) {
				// console.log("promise call")
				if (resolvePromise && rejectPromise) {
					if (!Array.isArray(options.chain)) return resolvePromise(null)
					if (options.chain.length === 0) return resolvePromise(null)
					const chainLength = options.chain.length
					const { method, args } = options.chain.shift() as RpcChain<string, unknown[]>
					const rpc: RpcCall = { id: nanoid(), method, args }
					if (chainLength > 1) rpc.chain = options.chain
					try {
						const result = handler(rpc)
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
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
				const result = promise[p].bind(promise)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return result
			}
			return this.nest(() => {})
		},
	})
}

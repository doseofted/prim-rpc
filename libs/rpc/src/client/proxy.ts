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
export function createMethodCatcher(options: MethodCatcherOptions = {}) {
	return new DeepProxy(
		{},
		{
			apply(target, thisArg, args: unknown[]) {
				const method = this.path.join(".")
				const rpc: RpcChain = { method, args }
				const chain = Array.isArray(options.chain) ? options.chain : []
				chain.push(rpc)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return createMethodCatcher({ ...options, chain })
			},
			get(_target, p, _receiver) {
				if (isPromiseMethodName(p)) {
					const promise = new Promise((resolve, _reject) => {
						if (!Array.isArray(options.chain)) return resolve(null)
						if (options.chain.length === 0) return resolve(null)
						const chainLength = options.chain.length
						const { method, args } = options.chain.shift()
						const rpc: RpcCall = { id: nanoid(), method, args }
						if (chainLength > 1) rpc.chain = options.chain
						resolve(rpc)
					})
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					return promise[p].bind(promise)
				}
				return this.nest(() => {})
			},
		}
	)
}

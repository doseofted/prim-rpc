import mitt from "mitt"
import { DeepProxy, DeepProxyHandler, DeepProxyOptions } from "proxy-deep"
import { RpcCall } from ".."
import { nanoid } from "nanoid"
import { RpcChain } from "../interfaces"

function isPromiseMethodName(given: PropertyKey): given is "then" | "catch" | "finally" {
	return ["then", "catch", "finally"].includes(given.toString())
}

/* class MethodCatcher<T extends object> extends DeepProxy<T> {
	events = mitt<{
		test: undefined
	}>()

	constructor(target: T, options?: DeepProxyOptions) {
		const handler: DeepProxyHandler<T> = {
			
		}
		super(target, handler, options)
	}

	get(target) {

	}
}

class A<T extends object> extends Proxy<T> {
	constructor(target: T, handler: ProxyHandler<T>) {
		super(target, handler)
	}
} */

interface ProxyOptions {
	chain?: RpcChain[]
	/** Method chaining requires a  */
	batchTime?: number
	internal?: {
		path?: string[]
	}
}

export function createMethodCatcher(options: ProxyOptions = {}) {
	options = {
		batchTime: 0,
		...options,
	}
	const internalEvents = mitt<{
		test: undefined
	}>()
	// let resolve: (value: unknown) => void
	// let reject: (reason?: any) => void
	// const promise = new Promise((res, rej) => {
	// 	resolve = res
	// 	reject = rej
	// })
	return new DeepProxy(
		{},
		{
			apply(target, thisArg, args: unknown[]) {
				console.log(this.path)
				const method = this.path.join(".")
				const rpc: RpcChain = { method, args }
				const chain = Array.isArray(options.chain) ? options.chain : []
				chain.push(rpc)
				console.log("apply", chain)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return createMethodCatcher({ ...options, chain })
			},
			get(_target, p, _receiver) {
				if (isPromiseMethodName(p)) {
					console.log("promise method", options.chain)

					// resolve(options.rpc)
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					// return promise[p].bind(promise)

					const promise = new Promise((resolve, _reject) => {
						resolve(options.chain)
					})
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					return promise[p].bind(promise)
				}
				return this.nest(() => {})
			},
		}
		// FIXME: DeepProxy options type is wrong (submit PR later)
		// { path: options?.path?.join(".") as unknown as string[] }
	)
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
// const a = promiseProxy<void>(r => r())

/** Don't use: too many nested objects that need to be iterated on */
const exampleCallVariant1 = [
	{
		method: "select/from",
		args: ["users"],
		chain: {
			method: "where",
			args: ["id", "=", 1],
			chain: {
				method: "execute",
				args: [],
				id: 1,
			},
		},
	},
]

/**
 * Pros:
 * - doesn't change structure of RPC or library logic
 * - defaults to direct method calls, chain is optional
 *
 * Cons:
 * - Root method call is not given in chain, lives outside of it
 *   - That could also be considered a benefit in some cases
 */
const exampleCallVariant2: RpcCall[] = [
	{
		id: 1,
		method: "select/from",
		args: ["users"],
		chain: [
			{
				method: "where",
				args: ["id", "=", 1],
			},
			{
				method: "execute",
				args: [],
			},
		],
	},
]

/**
 * Pros:
 * - Easy to read and understand
 *
 * Cons:
 * - Requires structural change to RPC across library (RPC call is now a union)
 * - Makes manual RPC calls slightly more difficult to explain in docs (and to learn)
 * - Missing root "method" and "args" could be confusing to end user making manual call
 */
const exampleCallVariant3: Partial<RpcCall>[] = [
	{
		id: 1,
		chain: [
			{
				method: "select/from",
				args: ["users"],
			},
			{
				method: "where",
				args: ["id", "=", 1],
			},
			{
				method: "execute",
				args: [],
			},
		],
	},
]

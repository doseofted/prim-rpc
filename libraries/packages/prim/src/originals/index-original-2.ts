/**
 * Prim-RPC is intended to allow me to write plain functions on the server and
 * then make those function calls on the client as if they were written there
 * but instead receive a response from the server, with proper type definitions.
 * 
 * This is basically a way for me to avoid REST and just write functions.
 * It can be used with any server framework as long as a plugin is written for
 * `createPrimServer` and can be used with any HTTP request library on the
 * client by providing the library as an option to `createPrim`.
 */
import ProxyDeep, { DeepProxy, DeepProxyConstructor, DeepProxyHandler, DeepProxyOptions, TrapThisArgument } from "proxy-deep"
import { get as getProperty } from "lodash"
import defu from "defu"

// IDEA: replace use of proxy with deep-proxy which seems to handle
// the nesting problem pretty well. Then use lodash "get" function to
// to get the value from the object on the server and use deep-proxy's
// path list to create RPC call for server to interpret into function

interface RpcBase {
	id?: string|number
}

export interface RpcErr<Data = unknown> {
	code: number
	message: string
	data?: Data
}

export interface RpcCall<Method = string, Params = unknown> extends RpcBase {
	method: Method
	params?: Params
}

export interface RpcAnswer<Result = unknown, Error = unknown> extends RpcBase {
	result?: Result
	error?: RpcErr<Error>
}

export class RpcError<T> extends Error implements RpcErr<T> {
	get code(): number { return this.err.code }
	get message(): string { return this.err.message }
	get data(): T|undefined { return this.err.data }
	get isRpcErr(): boolean { return !!this.err && this.message !== undefined && this.code !== undefined }

	send(): RpcErr<T> {
		const { code, message, data} = this
		return { code, message, data }
	}

	constructor(private err?: RpcErr<T>) {
		super()
	}
}

interface PrimOptions {
	/** `true` when Prim-RPC is used from server. A module to be resolved should also be given as argument to `createPrim` */
	server?: boolean
	/** When `options.server` is `false`, provide the server URL where Prim is being used, to be used from `options.client` */
	endpoint?: string
	/** When used from the client, override the HTTP framework used for requests (default is browser's `fetch()`) */
	client?: (jsonBody: RpcCall<string, unknown>, endpoint: string) => Promise<RpcAnswer>,
	internal?: {
		nested: number
	}
}

function createPrimOptions(options?: PrimOptions) {
	// first initialize given options and values for which to fallback
	const configured: PrimOptions = defu<PrimOptions, PrimOptions>(options, {
		// by default, it should be assumed that function is used client-side (assumed value for easier developer use from client-side)
		server: false,
		// if endpoint is not given then assume endpoint is relative to current url, following suggested `/prim` for Prim-RPC calls
		endpoint: "/prim",
		// `client()` is intended to be overridden so as not to force any one HTTP framework but default is fine for most cases
		client: async (jsonBody, endpoint) => {
			const result = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(jsonBody)
			})
			// RPC result should be returned on success and RPC error thrown if errored
			return result.json()
		},
		// these options should not be passed by a developer but are used internally
		internal: {
			nested: 0
		}
	})
	return configured
}

// TODO: Consider references below to add *nested* proxies later:
// REFERENCE: https://stackoverflow.com/a/41300128
// REFERENCE: https://www.npmjs.com/package/proxy-deep

/**
 * Prim-RPC can be used to write plain functions on the server and then call them easily from the client.
 * On the server, Prim-RPC is given parameters from a server framework to find the designated function on each request.
 * On the client, Prim-RPC translates each function call into an RPC that Prim-RPC can understand from the server.
 * 
 * @param options Options for utilizing functions provided with Prim
 * @param givenModule If `options.server` is true, provide the module where functions should be resolved
 * @returns A wrapper function around the given module or type definitions used for calling functions from server
 */
export function createPrim<T extends Record<V, T[V]>, V extends keyof T = keyof T>(options?: PrimOptions, givenModule?: T) {
	const configured = createPrimOptions(options)
	const empty = {} as T // when not given on client-side, treat empty object as T
	type PromisifiedFunction = <A extends V>(...args: Parameters<T[A]>) => Promise<ReturnType<T[A]>>
	// TODO: find way to wrap all `ReturnType`s in Promises on all T[V] functions ...not sure it's possible
	// (that way, code editors don't prompt message "'await' has no effect on ...")
	// NOTE: if given function is already async, then `await` is used anyway
	const proxy: T /* Record<V, PromisifiedFunction> */ = new ProxyDeep<T>(givenModule ?? empty, {
		apply(target, that, args) {
			// const found = getProperty(givenModule, this.path, {})
			console.log(`${this.path.slice(0, -1).join(".")}.${
				this.path[this.path.length - 1]}(${args.map(a => JSON.stringify(a)).join(", ")})`)
			// return found(...args).bind(that)
			const rpc = { method: this.path.join("."), params: args }
			const result = Reflect.apply(target as unknown as () => unknown, that, args)
			console.log(typeof result);
			return this.nest(() => ({}))
			// return this.nest(result)
			// return (typeof result === "function") ? this.nest(result) : result
			// target(...args)
			// return that
		},
		get (target, prop, receiver) {
			console.log(prop, target, this.rootTarget);
			
			if (prop in target) {
				return this.nest(Reflect.get(target, prop, receiver) ?? (() => ({ test: 5 })))
			}
		}
	})
	// console.log("new prim instance created", configured.internal.nested);
	return proxy
}

// IDEA: allow chaining of functions
// prim.getBlogPostByTitle("My Post").renameArticle("My New Post")
// this would chain RPC calls and send them off to the server in one request
// to be executed sequentially and with the results of the previous call.
// A websocket could also be used if available. Especially for any events
// that require immediate responses (like user confirmation before sending an event).
// A websocket could be used. Potential problem is if the first function in a chain is
// called but the resulting chain is not called.

// TODO: add support for query strings too (simple requests, for linked data, similar to JSON-LD links)
/**
 * Unlike `createPrim()`, this function is designed purely for the server. Rather than integrating directly with a
 * server framewor, it is meant to be given a JSON body expected for the RPC call and return the result as an RPC
 * answer. The integration with a server framework is just a wrapper around this function that prepares the RPC calls
 * and then does any processing needed (if any) before returning the result back.
 * 
 * @param options Options for utilizing functions provided with Prim
 * @param givenModule If `options.server` is true, provide the module where functions should be resolved
 * @returns A function that expects JSON resembling an RPC call
 */
export function createPrimServer<T extends Record<V, T[V]>, V extends keyof T = keyof T>(options?: PrimOptions, givenModule?: T) {
	const prim = createPrim(options, givenModule)
	return <A extends V>(rpc: RpcCall<A, Parameters<T[A]>>): Promise<RpcAnswer<ReturnType<T[A]>>>|RpcAnswer<ReturnType<T[A]>> => {
		const { method, params } = rpc
		// const args = Array.isArray(params) ? params : [params]
		try {
			return { result: prim[method](...params as unknown[]) }
		} catch (err) {
			// don't throw on server, simply return error to be interpreted as error on receiving client
			if (err instanceof RpcError) {
				const error = err.send()
				return { error }
			}
			return { error: new RpcError(err).send() }
		}
	}
}

/**
 * IDEA: consider creating createPrimUniversal that creates two instances of Prim, one for
 * client-side use, the other a server-side instance. This way, client-side placeholders
 * for functions could return immediately (and return optimistic response) while
 * waiting for the real response from the server. The client-side placeholdesr would
 * only contain a partial version of the server-side functions since not all functions
 * should return an optimistic response (instead they should just load).
 * This could look something like this (with a state library like Vue's):
 *
 * ```typescript
 * const { sayHello } = createPrimUniveral<typeof moduleServer>({ ...options }, {
 *   sayHello(name: string) { return `Loading, please wait ${name} ...` },
 *   sayGoodbye(...) { ... }
 * })
 * const { result, loading } = await sayHello("Ted")
 * watchEffect(() => console.log(result.value, loading ? "loading" : "loaded"))
 * ```
 * 
 * Another separate idea, related to data management rather than just RPC
 * is to allow these reactive values to be updated which would then trigger
 * a network request.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let idea: unknown


const db = new DeepProxy({}, {
	get(target, path, receiver) {
		console.log(`prop: ${this.path}`)
		this
		return this.nest(() => ({}))
	},
	apply(target, thisArg, argList) {
		// return this.path;
		console.log(`method: ${this.path}`)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const that = this as any
		that.test123
		return this.nest(() => ({}))
	}
}, { userData: { test123: "hello" } })

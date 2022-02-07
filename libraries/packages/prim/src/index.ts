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
import defu from "defu"

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
	const proxy: T /* Record<V, PromisifiedFunction> */ = new Proxy<T>(givenModule ?? empty, {
		apply(target, that, args) {
			console.log(target, that, args)
			return that
		},
		get (target, prop) {
			// if given object/module, recursively create a new instance of Prim to find function in that module
			if (prop in target && typeof target[prop] === "object") {
				// if nested functions, create a Prim instance for that module
				console.log("given prop", prop);
				return createPrim(configured, target[prop])
			}
			console.log("executing on proxy, prop:", prop)
			const promisedAnswer: PromisifiedFunction = (...args) => {
				console.log("attempted to call function:", prop, args)
				// if on server, return method on module
				if (prop in target && configured.server && typeof target[prop] === "function") {
					try {
						return target[prop](...args as unknown[])
					} catch (error) {
						const err = new RpcError(error)
						if (err.isRpcErr) { throw err }
						throw new Error(error)
					}
				}
				// on client, return result given from server
				const rpc = { method: prop.toString(), params: args }
				const answer = async () => {
					try {
						// gather answer and then return the result of RPC call back to the client
						const answer = await configured.client(rpc, configured.endpoint)
						if (answer.error) { throw answer.error }
						return answer.result
					} catch (error) {
						// it is expected for given module to throw if there is an error so that Prim-RPC can also error on the client
						const err = new RpcError(error)
						if (err.isRpcErr) { throw err }
						// if not an RPC error, throw a generic error with given data as message
						throw new Error(error)
					}
				}
				return answer()
			}
			// return promisedAnswer
			const proxiedPromisedAnswer = new Proxy(promisedAnswer, {
				apply(target, that, args) {
					console.log("calling method:", target, that, args)
					return target(...args as Parameters<T[V]>)
				},
				get(nestedTarget, nestedProp) {
					console.log("tried calling prop:", nestedProp, ", of prop:", prop)
					// NOTE: this works at odd intervals of nested levels when promised answer is returned here
					// and at even intervals, returning a new instance of Prim works
					/* const t = createPrim({
						...configured,
						internal: { nested: configured.internal.nested + 1 }
					})
					return t[nestedProp]() */
					// console.log("result of creating new prim instance:", t[nestedProp]());
					// return promisedAnswer
					return createPrim({
						...configured,
						internal: { nested: configured.internal.nested + 1 }
					})
				}
			})
			return proxiedPromisedAnswer
		}
	})
	console.log("new prim instance created", configured.internal.nested);
	return proxy
}

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

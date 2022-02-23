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
import ProxyDeep from "proxy-deep"
import { get as getProperty } from "lodash"
import defu from "defu"
import { RpcAnswer, RpcCall, RpcErr, PrimOptions } from "./prim.interface"
import { nanoid } from "nanoid"

export class RpcError<T> extends Error implements RpcErr<T> {
	get code(): number { return this.err.code }
	get message(): string { return this.err.message }
	get data(): T | undefined { return this.err.data }
	get isRpcErr(): boolean { return !!this.err && this.message !== undefined && this.code !== undefined }

	formatSend(): RpcErr<T> {
		const { code, message, data } = this
		return { code, message, data }
	}

	constructor(private err?: RpcErr<T>) {
		super()
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
		/* socket: {
			create<WebSocket>(endpoint) {
				return new WebSocket(endpoint)
			}
		}, */
		// these options should not be passed by a developer but are used internally
		internal: {
			nested: 0
		}
	})
	return configured
}

/**
 * Prim-RPC can be used to write plain functions on the server and then call them easily from the client.
 * On the server, Prim-RPC is given parameters from a server framework to find the designated function on each request.
 * On the client, Prim-RPC translates each function call into an RPC that Prim-RPC can understand from the server.
 * 
 * @param options Options for utilizing functions provided with Prim
 * @param givenModule If `options.server` is true, provide the module where functions should be resolved
 * @returns A wrapper function around the given module or type definitions used for calling functions from server
 */
export function createPrimClient<T extends Record<V, T[V]>, V extends keyof T = keyof T>(options?: PrimOptions, givenModule?: T) {
	const configured = createPrimOptions(options)
	const empty = {} as T // when not given on client-side, treat empty object as T
	const proxy = new ProxyDeep<T>(givenModule ?? empty, {
		apply(_emptyTarget, that, args) {
			// call available function on server
			const realTarget = getProperty(givenModule, this.path)
			if (configured.server && typeof realTarget === "function") {
				try {
					return Reflect.apply(realTarget, that, args)
				} catch (error) {
					const err = new RpcError(error)
					if (err.isRpcErr) { throw err }
					throw new Error(error)
				}
			}
			// if on client, send off request to server
			if (!configured.server) {
				const rpc: RpcCall = { method: this.path.join("/"), params: args }
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
		},
		get(_target, _prop, _receiver) {
			return this.nest(() => undefined)
		}
	})
	return proxy
}

// TODO: make this work with methods called in path over GET request
// the function should be restructured to accept: path, body, querystring
// and handle conditions like querystring in path, or body not being converted to string yet

/**
 * Common properties given by server frameworks so generic `createPrimServer`
 * can translate generic request into RPC.
 */
interface CommonFrameworkOptions {
	/** Typically the path without a querystring */
	path?: string
	/** The prefix where Prim lives. To be removed from the path. */
	prefix?: string
	/** The parsed querystring, usally a JSON object */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	query?: Record<string|number, any>
	/** The JSON body, which should already be formatted as RPC */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	body?: Record<string|number, any>
}
/**
 * Unlike `createPrimClient()`, this function is designed purely for the server. Rather than integrating directly with a
 * server framework, it is meant to be given a JSON body expected for the RPC call and return the result as an RPC
 * answer. The integration with a server framework is just a wrapper around this function that prepares the RPC calls
 * and then does any processing needed (if any) before returning the result back.
 * 
 * @param options Options for utilizing functions provided with Prim
 * @param givenModule If `options.server` is true, provide the module where functions should be resolved
 * @returns A function that expects JSON resembling an RPC call
 */
export function createPrimServer<T extends Record<V, T[V]>, V extends keyof T = keyof T>(options?: PrimOptions, givenModule?: T) {
	const prim = createPrimClient(options, givenModule)
	const primRpc = async (rpc: RpcCall): Promise<RpcAnswer> => {
		const { method, params, id } = rpc
		// const args = Array.isArray(params) ? params : [params]
		try {
			const methodExpanded = method.split("/")
			const target = getProperty(prim, methodExpanded)
			console.log(methodExpanded)
			return { result: await target(...params as unknown[]), id }
		} catch (err) {
			// don't throw on server, simply return error to be interpreted as error on receiving client
			if (err instanceof RpcError) {
				const error = err.formatSend()
				return { error, id }
			}
			return { error: new RpcError(err).formatSend(), id }
		}
	}
	// NOTE: accepts JSON body or variant given in path like so:
	// /prefix/sayHello?-id=123&-=Hello&-=Ted
	return async (given: CommonFrameworkOptions) => {
		const { path, prefix, query } = given
		const bodyFromPath = (() => {
			const method = path?.replace(prefix, "")
			const id = query?.["-id"]
			if (query) { delete query["-id"] }
			const params = query
			return { method, params, id }
		})()
		const { body } = given
		// TODO: stop defu from concatenating params
		const rpc = defu.fn<Partial<RpcCall>, RpcCall>(
			body ?? bodyFromPath,
			{ id: nanoid(), method: "default" }
		)
		return primRpc(rpc)
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

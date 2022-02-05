import defu from "defu"
// import { ref, Ref, toRefs, watchEffect } from "vue"
// import * as example from "./example"
interface RpcBase {
	id?: string|number
}

interface RpcErr<Data = unknown> {
	code: number
	message: string
	data?: Data
}

interface RpcCall<Method = string, Params = unknown> extends RpcBase {
	method: Method
	params?: Params
}

interface RpcAnswer<Result = unknown, Error = unknown> extends RpcBase {
	result?: Result
	error?: RpcErr<Error>
}

// extend as needed
export class RpcError<T> extends Error implements RpcErr<T> {
	code: number
	data?: T
	message: string

	constructor(err: RpcErr<T>) {
		super()
		this.message = err.message
		this.code = err.code
		this.data = err.data
	}
}

interface PrimOptions {
	/** `true` when Prim-RPC is used from server. A module to be resolved should also be given as argument to `createPrim` */
	server?: boolean
	/** When `options.server` is `false`, provide the server URL where Prim is being used */
	endpoint?: string
	/** When used from the client, override the HTTP framework used for requests (default is browser's `fetch()`) */
	client?: <Method = string, Params = unknown, Answer = unknown>(jsonBody: RpcCall<Method, Params>) => Promise<RpcAnswer<Answer>>
}

/**
 * Prim-RPC can be used to write plain functions on the server and then call them easily from the client.
 * On the server, Prim-RPC is given parameters from a server framework to find the designated function on each request.
 * On the client, Prim-RPC translates functions into an RPC call that Prim-RPC can understand from the server.
 * 
 * ```js
 * // server
 * 
 * ```
 * 
 * @param options Options for utilizing functions provided with Prim
 * @param givenModule If `options.server` is true, provide the module where functions should be resovled
 * @returns A wrapper function around the given module or type definitions used for calling functions from server
 */
export function createPrim<T extends Record<keyof T, T[V]>, V extends keyof T = keyof T>(options?: PrimOptions, givenModule?: T) {
	// first initialize options
	const opts: PrimOptions= defu<PrimOptions, PrimOptions>(options, {
		endpoint: "/prim",
		client: async (jsonBody) => {
			const result = await fetch(opts.endpoint, {
				method: "POST",
				body: JSON.stringify(jsonBody)
			})
			return result.json()
		}
	})
	// now return function that can be used client or server-side
	/**
	 * @throws {RpcError} An object extending Error resembling expected response from server
	 */
	return async <A extends V>(method: A, ...p: Parameters<T[A]>): Promise<ReturnType<T[A]>> => {
		// on server, return the result of the function since the function is available
		if (opts.server) {
			return givenModule?.[method](...p as unknown[])
		}
		// if one argument is given, remove array that argument is contained in
		const params = (Array.isArray(p) && p[0] !== undefined && p[1] === undefined) ? p[0] : p
		const rpc: RpcCall<A, Parameters<T[A]>> = { method, params }
		try {
			const answer = await opts.client<A, Parameters<T[A]>, ReturnType<T[A]>>(rpc)
			return answer.result
		} catch (error) {
			if (error instanceof RpcError) {
				throw new RpcError(error as RpcErr)
			} else {
				throw new Error(error)
			}
		}
		// return answer.value as Ref<ReturnType<T[A]>>
		// TODO: when server-side receives request, it should return result from module
		
	}
}


// TODO: this is a client-side version but a server-side version needs to make functions available over RPC

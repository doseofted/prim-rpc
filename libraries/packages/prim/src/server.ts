import { RpcError } from "./error"
import { createPrimClient } from "./prim"
import { CommonFrameworkOptions, PrimOptions, RpcAnswer, RpcCall } from "./common.interface"
import { get as getProperty } from "lodash"
import defu from "defu"
import { nanoid } from "nanoid"
import { getQuery, parseURL } from "ufo"
import { createNanoEvents } from "nanoevents"

// TODO: make this work with methods called in path over GET request
// the function should be restructured to accept: path, body, querystring
// and handle conditions like querystring in path, or body not being converted to string yet

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
	const givenOptions = options ?? {}
	const event = createNanoEvents()
	givenOptions.internal = { event }
	const prim = createPrimClient(givenOptions, givenModule)
	const primRpc = async (rpc: RpcCall): Promise<RpcAnswer> => {
		const { method, params, id } = rpc
		// const args = Array.isArray(params) ? params : [params]
		try {
			const methodExpanded = method.split("/")
			const target = getProperty(prim, methodExpanded)
			// console.log(methodExpanded)
			// TODO: go through params and look for callbacks, using configured "options.socket" to send back response
			if (Array.isArray(params)) {
				return { result: await target(...params), id }
			} else {
				return { result: await target(params), id }
			}
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
		const { url: urlGiven, prefix = "/prim" } = given
		const url = parseURL(urlGiven)
		const query = getQuery(url.search)
		const bodyFromPath = (() => {
			const method = url.pathname.replace(prefix + "/", "")
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let params: any = query
			const id = query["-id"]
			delete query["-id"]
			if (Object.keys(query).length === 1 && "-" in query) {
				params = query["-"] // all arguments are positional
			}
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

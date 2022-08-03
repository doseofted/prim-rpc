/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { RpcError } from "./error"
import { createPrimClient } from "./prim"
import { CommonFrameworkOptions, PrimOptions, PrimWebSocketEvents, RpcAnswer, RpcCall } from "./interfaces"
import { get as getProperty } from "lodash-es"
import { defu } from "defu"
import { nanoid } from "nanoid"
import { getQuery, parseURL } from "ufo"
import mitt, { Emitter } from "mitt"
import { createPrimOptions } from "./options"

// TODO: make this work with methods called in path over GET request
// the function should be restructured to accept: path, body, querystring
// and handle conditions like querystring in path, or body not being converted to string yet

export interface PrimServer {
	rpc: (given: CommonFrameworkOptions) => Promise<RpcAnswer|RpcAnswer[]>
	ws: Emitter<PrimWebSocketEvents>
	// TODO: consider alternate way of passing options to websocket plugin on server,
	// since they can't be modified here (because they've already been used)
	opts: PrimOptions
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
export function createPrimServer<T extends Record<V, T[V]>, V extends keyof T = keyof T>(givenModule?: T, options?: PrimOptions): PrimServer {
	const ws = mitt<PrimWebSocketEvents>()
	const givenOptions = createPrimOptions(options)
	// if server is false, Prim Server should forward request to another Prim Server otherwise resolve locally
	if (options?.server === undefined) { givenOptions.server = true } // assume `server` is true if option was not given
	givenOptions.internal = { event: ws }
	const prim = createPrimClient<typeof givenModule>(givenOptions, givenModule)
	const makeRpcCall = async (rpc: RpcCall): Promise<RpcAnswer> => {
		const { method, params, id } = rpc
		// const args = Array.isArray(params) ? params : [params]
		try {
			const methodExpanded = method.split("/")
			const target = getProperty<T, keyof T>(prim, methodExpanded as [keyof T])
			// console.log(methodExpanded)
			// TODO: go through params and look for callbacks, using configured "options.socket" to send back response
			if (Array.isArray(params)) {
				return { result: await target(...params as unknown[]), id }
			} else {
				return { result: await target(params), id }
			}
		} catch (e: unknown) {
			const err = e as RpcError<unknown>
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
	const rpc = async (given: CommonFrameworkOptions) => {
		const { url: urlGiven, prefix = "/prim" } = given
		const url = parseURL(urlGiven)
		const query = getQuery(url.search)
		const bodyFromPath = ((): Partial<RpcCall> => {
			const method = url.pathname.replace(prefix + "/", "")
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let params: any = query
			const id = String(query["-id"])
			delete query["-id"]
			if (Object.keys(query).length === 1 && "-" in query) {
				params = query["-"] // all arguments are positional
			}
			return { method, params, id }
		})()
		// TODO: find out how to deal with pre-parsed JSON. Fastify and Express/body-parser don't seem to provide string.
		// Ideally JSON handler could be flexible enough to even handle YAML (not that you would) however when I'm provided
		// an object and and custom JSON handler, I have to stringify result to use the given handler.
		// However, I may want to
		let { body } = given
		// if given a JSON handler, use that parser rather than using result of parser used by server
		// (it's encouraged to pass body as string from server when using separate JSON handler)
		if (givenOptions.jsonHandler !== JSON && typeof body !== "undefined") {
			if (typeof body !== "string") {
				// since alternative JSON handling library will likely expect a string, transform given body to a string if
				// server framework used with Prim has already parsed body.
				// While ideally the server framework would just provide a string to Prim for parsing, most users of frameworks
				// like Express will use body-parser which already transforms body without leaving a "raw body" for me to use
				// NOTE: using native stringify instead of given JSON handler because input needs to be in format expected by
				// JSON handler
				body = JSON.stringify(body)
			}
			body = givenOptions.jsonHandler.parse(body)
		} else if (typeof body === "string") {
			// if custom handler is not given but body is still string, parse it using default JSON handler
			body = givenOptions.jsonHandler.parse(body)
		}
		const callWithDefaults = async (body: Partial<RpcCall>) => {
			// TODO: stop defu from concatenating params
			const rpc = defu<Partial<RpcCall>, RpcCall>(body, { id: nanoid(), method: "default" })
			const result = await makeRpcCall(rpc)
			// NOTE: use native JSON parse to keep any data that custom JSON handler added
			// (for instance, superjson's meta property)
			// TODO: if server framework used with Prim accepts text, JSON.parse is not needed
			// (in which case remove the statement and just set Content-Type header in the used Prim Plugin)
			const resultParsed: typeof result = givenOptions.jsonHandler === JSON
				? result
				: JSON.parse(givenOptions.jsonHandler.stringify(result))
			return resultParsed
		}
		// if RPC calls are batched, answer all calls, otherwise answer the single RPC call
		if (Array.isArray(body)) {
			const results = body.map(b => callWithDefaults(b ?? bodyFromPath))
			return Promise.all(results)
		} else {
			return callWithDefaults(body ?? bodyFromPath)
		}
	}
	return { rpc, ws, opts: givenOptions }
}

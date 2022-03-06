/**
 * Prim-RPC is intended to allow me to write plain functions on the server and
 * then make those same function calls on the client as if they were written
 * there but instead receive a response from the server, with proper type
 * definitions.
 * 
 * This is basically a way for me to avoid REST and just write plain functions.
 * It can be used with any server framework as long as a plugin is written for
 * `createPrimServer` and can be used with any HTTP request library on the
 * client by providing the library as an option to `createPrim`.
 */
import ProxyDeep from "proxy-deep"
import { get as getProperty } from "lodash"
import defu from "defu"
import { RpcError } from "./error"
import { RpcCall, PrimOptions } from "./common.interface"
import { nanoid } from "nanoid"
import { createNanoEvents } from "nanoevents"

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
					throw new RpcError(error)
				}
			}
			// if on client, send off request to server
			if (!configured.server) {
				const rpc: RpcCall = { method: this.path.join("/"), params: args, id: nanoid() }
				// TODO: read arguments and if callback is found, use a websocket
				return configured.client(rpc, configured.endpoint)
					.then(answer => {
						if (answer.error) {
							throw answer.error
						}
						return answer.result
					})
					.catch((error) => {
						// it is expected for given module to throw if there is an error so that Prim-RPC can also error on the client
						throw new RpcError(error)
					})
			}
		},
		get(_target, _prop, _receiver) {
			return this.nest(() => undefined)
		}
	})
	const emitter = createNanoEvents()
	emitter.on("t", () => console.log("test"))
	emitter.emit("t")
	return proxy
}

/**
 * Set default options including creation of default clients used by Prim.
 *
 * @param options Given options by developer
 * @returns Options with defaults set
 */
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
		socket(endpoint, response) {
			const ws = new WebSocket(endpoint)
			ws.onmessage = (({ data: message }) => {
				response(message)
			})
			const send = (msg: string) => ws.send(msg)
			return { send }
		},
		// these options should not be passed by a developer but are used internally
		internal: {}
	})
	return configured
}

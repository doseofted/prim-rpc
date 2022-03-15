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
import { RpcError } from "./error"
import { RpcCall, PrimOptions, RpcAnswer, PrimWebsocketEvents } from "./interfaces"
import { nanoid } from "nanoid"
import { createNanoEvents } from "nanoevents"
import { createPrimOptions } from "./options"

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
					// At this point, all callbacks have been replaced with identifiers so I should go through each reference
					// and make a callback that emits a "response" type which will be sent back over the websocket with identifier
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					args = (args as any[]).map(arg => {
						if (!(typeof arg === "string" && arg.startsWith("_cb_"))) { return arg }
						return (...cbArgs) => {
							event.emit("response", { result: cbArgs, id: arg })
						}
					})
					const result = Reflect.apply(realTarget, that, args)
					// TODO instead of returning result directly back to Prim Server, wrap this in an RPC respons with the given
					// ID and return that (similar to how callbacks answers are handled above). This would allow me to move
					// more RPC functionality into this library and keep Prim Server as a way of translating requests into RPC.
					// NOTE see `makeRpcCall` in Prim Server and consider moving that functionality into the client
					return result
				} catch (error) {
					throw new RpcError(error)
				}
			}
			// if on client, send off request to server
			if (!configured.server) {
				let callbacksGiven = false
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				args = (args as any[]).map((a) => {
					if (typeof a !== "function") { return a }
					callbacksGiven = true
					const generatedId = "_cb_" + nanoid()
					/* const unbind =  */event.on("response", (msg) => {
						if (msg.id !== generatedId) { return }
						if (Array.isArray(msg.result)) {
							a(...msg.result)
						} else {
							a(msg.result)
						}
						// TODO: it's hard to unbind until I know callback won't fire anymore
						// I may need to just move old events to a deprioritized list so the
						// list of events doesn't become unwieldy and potentially slow down
						// new callbacks/events
						// unbind()
					})
					return generatedId
				})
				const rpc: RpcCall = { method: this.path.join("/"), params: args, id: nanoid() }
				// TODO: read arguments and if callback is found, use a websocket
				if (callbacksGiven) {
					sendMessage(rpc)
					// return
				}
				// TODO: write wrapper around client to support batch requests and instead make below return a promise that
				// becomes resolved when either answered in a batch respone over HTTP or answered over websocket.
				// See `batchRequests` idea in this project.
				return configured.client(configured.endpoint, rpc)
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
	const event = configured.internal.event ?? createNanoEvents<PrimWebsocketEvents>()
	function createWebsocket(initialMessage: RpcCall) {
		const response = (given: RpcAnswer) => {
			event.emit("response", given)
		}
		const ended = () => {
			sendMessage = setupWebsocket
			event.emit("end")
		}
		const connected = () => {
			// event.emit("connect")
			// NOTE connect event should only happen once so initial message will be sent then
			send(initialMessage)
		}
		const { send } = configured.socket(configured.wsEndpoint, { connected, response, ended })
		sendMessage = send
	}
	/** Internal function referenced when a WebSocket connection has not been created yet */
	const setupWebsocket = (msg: RpcCall) => createWebsocket(msg)
	/** Sets up WebSocket if needed, then sends a message */
	let sendMessage: (message: RpcCall) => void = setupWebsocket
	return proxy
}

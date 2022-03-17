/**
 * Prim-RPC is intended to allow me to write plain functions on the server and
 * then make those same function calls on the client as if they were written
 * there but instead receive a response from the server, with proper type
 * definitions.
 * 
 * This is basically a way for me to avoid REST and just write plain functions.
 * It can be used with any server framework as long as a plugin is written for
 * `createPrimServer` and can be used with any HTTP request library on the
 * client by providing the library as an option to `createPrimClient`.
 */
import ProxyDeep from "proxy-deep"
import { get as getProperty, remove as removeFromArray } from "lodash"
import { nanoid } from "nanoid"
import { createNanoEvents } from "nanoevents"
import { RpcCall, PrimOptions, RpcAnswer, PrimWebsocketEvents } from "./interfaces"
import { createPrimOptions } from "./options"
import { RpcError } from "./error"

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

	// SECTION: WIP, batched calls
	// const queuedCalls: { time: Date, rpc: RpcCall, result: Promise<RpcAnswer>, resolved?: "yes"|"pending" }[] = []
	// const httpEvent = createNanoEvents<{
	// 	response: (result: RpcAnswer) => void
	// 	queue: (given: { time: Date, rpc: RpcCall, result: Promise<RpcAnswer>, resolved?: "yes"|"pending" }) => void
	// }>()
	// let timer: ReturnType<typeof setTimeout>
	// const batchedRequests = () => {
	// 	if (timer) { return }
	// 	timer = setTimeout(async () => {
	// 		const rpcList = queuedCalls.filter(c => !c.resolved)
	// 		rpcList.forEach(r => { r.resolved = "pending" })
	// 		timer = undefined
	// 		configured.client(configured.endpoint, rpcList.map(r => r.rpc), configured.jsonHandler)
	// 			.then(answer => {
	// 				if (Array.isArray(answer)) {
	// 					answer.forEach(a => {
	// 						httpEvent.emit("response", a)
	// 					})
	// 				} else {
	// 					httpEvent.emit("response", answer)
	// 				}
	// 			})
	// 			.catch((error) => {
	// 				if (Array.isArray(error)) {
	// 					error.forEach(e => { httpEvent.emit("response", e) })
	// 				} else {
	// 					rpcList.forEach(r => { httpEvent.emit("response", { id: r.rpc.id, error }) })
	// 				}
	// 			}).finally(() => {
	// 				removeFromArray(queuedCalls, given => given.resolved === "pending")
	// 			})
	// 	}, configured.clientBatchTime)
	// }
	// httpEvent.on("queue", (given) => {
	// 	queuedCalls.push(given)
	// 	batchedRequests()
	// 	// TODO: create a timer for given calls, and once done, make batch request then emit "individualResponse" for each answer
	// })
	// !SECTION

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
							wsEvent.emit("response", { result: cbArgs, id: arg })
						}
					})
					const result = Reflect.apply(realTarget, that, args)
					// TODO instead of returning result directly back to Prim Server, wrap this in an RPC response with the given
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
					/* const unbind =  */wsEvent.on("response", (msg) => {
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

				// SECTION: WIP, batched calls
				// const result = new Promise<RpcAnswer>((resolve, reject) => {
				// 	httpEvent.on("response", (answer) => {
				// 		if (rpc.id !== answer.id) { return }
				// 		if (answer.error) { reject(answer.error) } else { resolve(answer) }
				// 	})
				// })
				// const time = new Date()
				// httpEvent.emit("queue", { time, rpc, result })
				// return result
				// !SECTION

				// TODO: write wrapper around client to support batch requests and instead make below return a promise that
				// becomes resolved when either answered in a batch respone over HTTP or answered over websocket.
				// See `batchRequests` idea in this project.
				return configured.client(configured.endpoint, rpc, configured.jsonHandler)
					.then(answer => {
						if (Array.isArray(answer)) {
							// TODO add support for multiple responses, see TODO above
							throw new RpcError({ message: "Not implemented.", code: -1 })
						}
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
	const wsEvent = configured.internal.event ?? createNanoEvents<PrimWebsocketEvents>()
	function createWebsocket(initialMessage: RpcCall) {
		const response = (given: RpcAnswer) => {
			wsEvent.emit("response", given)
		}
		const ended = () => {
			sendMessage = setupWebsocket
			wsEvent.emit("end")
		}
		const connected = () => {
			// event.emit("connect")
			// NOTE connect event should only happen once so initial message will be sent then
			send(initialMessage)
		}
		const { send } = configured.socket(configured.wsEndpoint, { connected, response, ended }, configured.jsonHandler)
		sendMessage = send
	}
	/** Internal function referenced when a WebSocket connection has not been created yet */
	const setupWebsocket = (msg: RpcCall) => createWebsocket(msg)
	/** Sets up WebSocket if needed, then sends a message */
	let sendMessage: (message: RpcCall) => void = setupWebsocket
	return proxy
}

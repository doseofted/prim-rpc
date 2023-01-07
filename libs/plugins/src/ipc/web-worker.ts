import {
	PrimClientMethodPlugin,
	PrimServerCallbackHandler,
	PrimServerMethodHandler,
	PrimClientCallbackPlugin,
	RpcAnswer,
	RpcCall,
} from "@doseofted/prim-rpc"
import { nanoid } from "nanoid"

// SECTION Shared options

// FIXME: determine if structured cloning is specific to "message" event only
// if it is, then RPC should be sent as message event and all other messages over custom events

/**
 * NOTE: Web Workers, by default, post messages using a
 * [structured cloning algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
 * which is typically more powerful than typical JSON serialization. This situation needs to be considered because currently
 * the Prim client sets JSON handler options (not plugins). While this plugin can support using a JSON handler, it's not
 * nearly as powerful so this may need to be noted in the plugin's documentation that the JSON handler should just pass
 * information transparently through instead of serializing/deserializing it.
 */
// FIXME: this plugin only works (for now) by bypassing the JSON handler on the Prim client/server using the following:
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const jsonHandler = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
	parse: (given: string) => given as any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	stringify: (given: any) => given as string,
}

interface CallbackSharedWebWorkerOptions {
	worker: Worker | Window
}

// !SECTION

// SECTION Callback handler / plugin

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface CallbackPluginWebWorkerOptions extends CallbackSharedWebWorkerOptions {
	// ...
}

// TODO: consider making two versions: worker-server (main is client) and worker-client (main is server)
// and try to make them share as much code as possible (this means 2 plugins and 2 handlers for web workers)

export const createCallbackPlugin = (options: CallbackPluginWebWorkerOptions): PrimClientCallbackPlugin => {
	const { worker = self } = options
	return (_endpoint, { connected, response }, jsonHandler) => {
		const id = nanoid()
		customAddEventListener(worker, `connected:${id}`, () => {
			console.log("connected?")
			customAddEventListener(worker, `callback:connected:${id}`, () => {
				customAddEventListener(worker, `server:message:${id}`, ({ detail: result }) => {
					// NOTE: result is expected to be string (over network but is likely not over web workers)
					response(jsonHandler.parse(result as unknown as string))
				})
				connected()
			})
			customDispatchEvent(worker, `callback:connect:${id}`, { detail: null })
		})
		setTimeout(() => {
			customDispatchEvent(worker, `connect`, { detail: id })
		}, 0)
		return {
			send(message, _blobs) {
				customDispatchEvent(worker, `client:message:${id}`, { detail: jsonHandler.stringify(message) })
			},
		}
		// worker.addEventListener("message", (event: MessageEvent<RpcAnswer>) => {
		// 	response(event.data)
		// })
		// worker.addEventListener("error", () => {
		// 	ended()
		// })
		// setTimeout(() => {
		// 	connected()
		// }, 0)
		// return {
		// 	send(message, _blobs) {
		// 		worker.postMessage(message)
		// 	},
		// }
	}
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface CallbackHandlerWebWorkerOptions extends CallbackSharedWebWorkerOptions {
	// ...
}
// TODO: consider what to do when JSON handler is used (and either string or binary contents are given instead of actual RPC)
export const createCallbackHandler = (options: CallbackHandlerWebWorkerOptions): PrimServerCallbackHandler => {
	const { worker = self } = options
	return prim => {
		// NOTE: duplicate connect/callback:connect events may be extraneous for web workers
		// (this doesn't necessarily need to mirror network calls)
		customAddEventListener(worker, "connect", ({ detail: id }) => {
			console.log("connect?", id)
			customAddEventListener(worker, `callback:connect:${id}`, () => {
				const { call, rpc: makeRpc } = prim.connected()
				customAddEventListener(worker, `client:message:${id}`, ({ detail: rpc }) => {
					if (typeof rpc === "string") {
						call(rpc, detail => {
							customDispatchEvent(worker, `server:message:${id}`, { detail })
						})
					} else {
						makeRpc(rpc, detail => {
							customDispatchEvent(worker, `server:message:${id}`, { detail })
						})
					}
				})
				// customAddEventListener(worker, `ended:${id}`, () => {})
				customDispatchEvent(worker, `callback:connected:${id}`, { detail: null })
			})
			customDispatchEvent(worker, `connected:${id}`, { detail: null })
		})
		// worker.addEventListener("message", (event: MessageEvent<RpcCall>) => {
		// 	// FIXME: typescript definitions need to be adjusted since JSON handler is (likely) not needed
		// 	call(event.data as unknown as string, data => {
		// 		worker.postMessage(data)
		// 	})
		// })
		// worker.addEventListener("error", () => {
		// 	ended()
		// })
		// const { call, ended } = prim.connected()
	}
}
// !SECTION

// SECTION Method handler / plugin

// FIXME: I may be able to remove the method handler/plugins altogether for Worker-related plugins. As long as Prim client can
// fallback to the the callback plugin/handlers if method-plugin is not given, then this may not be needed. Especially since
// the callback plugin has more functionality than the method plugin (method plugin is simpler for HTTP requests since
// I can only pass a request and a response).

export const createMethodPlugin = (options: CallbackPluginWebWorkerOptions): PrimClientMethodPlugin => {
	const { worker = self } = options
	return (_endpoint, message) =>
		new Promise((resolve, reject) => {
			const listener = (event: MessageEvent<RpcAnswer>) => {
				worker.removeEventListener("message", listener)
				resolve(event.data)
			}
			worker.addEventListener("message", listener)
			worker.addEventListener("error", err => {
				reject(err)
			})
			worker.postMessage(message)
		})
}

export const createMethodHandler = (options: CallbackHandlerWebWorkerOptions): PrimServerMethodHandler => {
	const { worker } = options
	return prim => {
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		worker.addEventListener("message", async (event: MessageEvent<RpcCall>) => {
			const result = await prim.server().prepareRpc(event.data)
			worker.postMessage(result)
		})
	}
}
// !SECTION

// SECTION: Custom events for web workers

// NOTE: this section is not used yet but could be useful for other types of workers (this may be deleted later)

type ConnectionEvents = {
	connect: CustomEvent<string>
	[connected: `connected:${string}`]: CustomEvent<null>
}

type CallbackEvents = {
	[connect: `callback:connect:${string}`]: CustomEvent<null>
	[connected: `callback:connected:${string}`]: CustomEvent<null>
	[clientMessage: `client:message:${string}`]: CustomEvent<RpcCall | RpcCall[] | string>
	[serverMessage: `server:message:${string}`]: CustomEvent<RpcAnswer | RpcAnswer[] | string>
	[ended: `ended:${string}`]: CustomEvent<null>
}

type MethodEvents = {
	[request: `request:${string}`]: CustomEvent<RpcCall | RpcCall[] | string>
	[response: `response:${string}`]: CustomEvent<RpcAnswer | RpcAnswer[] | string>
}

type PrimEventDetail = ConnectionEvents & CallbackEvents & MethodEvents
type PrimEvent = keyof PrimEventDetail

type PossibleContext = Window | Worker // | SharedWorker | ServiceWorker

/** Should CustomEvent be used or "message" events? */
// const POST_MESSAGE = true

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function customDispatchEvent<T extends PrimEvent>(
	parent: PossibleContext,
	event: T,
	data: Partial<PrimEventDetail[T]> & Pick<PrimEventDetail[T], "detail">
) {
	console.debug(event, "event", data?.detail)
	// if (POST_MESSAGE) {
	// 	return parent.postMessage({ data, event })
	// }
	return parent.dispatchEvent(new CustomEvent(event, data))
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function customAddEventListener<T extends PrimEvent>(
	parent: PossibleContext,
	event: T,
	callback: (event: PrimEventDetail[T]) => void
) {
	console.debug("listening", event)
	// if (POST_MESSAGE) {
	// 	parent.addEventListener("message", e => {
	// 		const event = e as PrimEventDetail[T]
	// 		const d = e as unknown as { data: unknown, event: T }
	// 		if (d.event === event) {
	// 			const a = { detail: d.data } as PrimEventDetail[T]
	// 			callback(a)
	// 		}
	// 	})
	// }
	return parent.addEventListener(event, e => {
		const event = e as PrimEventDetail[T]
		callback(event)
	})
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function customRemoveEventListener<T extends PrimEvent>(
	parent: PossibleContext,
	event: T,
	callback: (event: PrimEventDetail[T]) => void
) {
	return parent.removeEventListener(event, callback)
}
// !SECTION

import {
	PrimClientMethodPlugin,
	PrimServerCallbackHandler,
	PrimServerMethodHandler,
	PrimClientCallbackPlugin,
	RpcAnswer,
	RpcCall,
} from "@doseofted/prim-rpc"
import { nanoid } from "nanoid"
import mitt from "mitt"
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
	const transport = setupMessageTransport(worker)
	return (_endpoint, { connected, response }, jsonHandler) => {
		const id = nanoid()
		transport.on(`connected:${id}`, () => {
			transport.on(`server:message:${id}`, result => {
				// NOTE: result is expected to be string (over network but is likely not over web workers)
				response(jsonHandler.parse(result as unknown as string))
			})
			connected()
		})
		setTimeout(() => {
			transport.send("connect", id)
		}, 0)
		return {
			send(message, _blobs) {
				transport.send(`client:message:${id}`, jsonHandler.stringify(message))
			},
		}
	}
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface CallbackHandlerWebWorkerOptions extends CallbackSharedWebWorkerOptions {
	// ...
}
// TODO: consider what to do when JSON handler is used (and either string or binary contents are given instead of actual RPC)
export const createCallbackHandler = (options: CallbackHandlerWebWorkerOptions): PrimServerCallbackHandler => {
	const { worker = self } = options
	const transport = setupMessageTransport(worker)
	return prim => {
		transport.on("connect", id => {
			const { call, rpc: makeRpc } = prim.connected()
			transport.on(`client:message:${id}`, rpc => {
				if (typeof rpc === "string") {
					call(rpc, detail => {
						transport.send(`server:message:${id}`, detail)
					})
				} else {
					makeRpc(rpc, detail => {
						transport.send(`server:message:${id}`, detail)
					})
				}
			})
			transport.send(`connected:${id}`, null)
		})
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

// SECTION: Message event wrapper

type ConnectionEvents = {
	connect: string
	[connected: `connected:${string}`]: void
}

type CallbackEvents = {
	[clientMessage: `client:message:${string}`]: RpcCall | RpcCall[] | string
	[serverMessage: `server:message:${string}`]: RpcAnswer | RpcAnswer[] | string
	[ended: `ended:${string}`]: void
}

type MethodEvents = {
	[request: `request:${string}`]: RpcCall | RpcCall[] | string
	[response: `response:${string}`]: RpcAnswer | RpcAnswer[] | string
}

type PrimEventDetail = ConnectionEvents & CallbackEvents & MethodEvents
type PrimEventName = keyof PrimEventDetail
type PrimEventStructure<T extends PrimEventName> = { event: T; data: PrimEventDetail[T] }

type PossibleContext = Window | Worker // | SharedWorker | ServiceWorker

function setupMessageTransport(parent: PossibleContext) {
	const eventsReceived = mitt<PrimEventDetail>()
	const callback = ({ data: given }: MessageEvent<PrimEventStructure<PrimEventName>>) => {
		eventsReceived.emit(given.event, given.data)
	}
	parent.addEventListener("message", callback)
	return {
		on<T extends PrimEventName>(event: T, cb: (data: PrimEventDetail[T]) => void) {
			eventsReceived.on(event, cb)
			return () => eventsReceived.off(event, cb)
		},
		send<T extends PrimEventName>(event: T, data: PrimEventDetail[T]) {
			parent.postMessage({ event, data })
		},
		destroy() {
			eventsReceived.all.clear()
			parent.removeEventListener("message", callback)
		},
	}
}

// !SECTION

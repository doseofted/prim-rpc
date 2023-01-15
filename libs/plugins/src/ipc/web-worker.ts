import {
	PrimClientMethodPlugin,
	PrimServerCallbackHandler,
	PrimServerMethodHandler,
	PrimClientCallbackPlugin,
	RpcAnswer,
	RpcCall,
	JsonHandler,
	BlobRecords,
} from "@doseofted/prim-rpc"
import { nanoid } from "nanoid"
import mitt from "mitt"
// SECTION Shared options

/**
 * A passthrough JSON handler that doesn't serialize data.
 * Useful when structured cloning is used with Web Workers.
 */
const jsonHandlerPassthrough: JsonHandler = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
	parse: given => given as any,
	stringify: given => given as string,
}

interface SharedWebWorkerOptions {
	worker: Worker | Window // | SharedWorker | ServiceWorker
}

// !SECTION

// SECTION Callback handler / plugin

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface CallbackPluginWebWorkerOptions extends SharedWebWorkerOptions {}
export const createCallbackPlugin = (options: CallbackPluginWebWorkerOptions) => {
	const { worker = self } = options
	const transport = setupMessageTransport(worker)
	const callbackPlugin: PrimClientCallbackPlugin = (_endpoint, { connected, response }, jsonHandler) => {
		const id = nanoid()
		transport.on(`callback:connected:${id}`, () => {
			transport.on(`server:message:${id}`, result => {
				// NOTE: result is expected to be string (over network but is likely not over web workers)
				response(jsonHandler.parse(result as unknown as string))
			})
			connected()
		})
		setTimeout(() => {
			transport.send("callback:connect", id)
		}, 0)
		return {
			close() {
				transport.destroy()
			},
			send(message, _blobs) {
				transport.send(`client:message:${id}`, jsonHandler.stringify(message))
			},
		}
	}
	return { callbackPlugin, jsonHandler: jsonHandlerPassthrough }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface CallbackHandlerWebWorkerOptions extends SharedWebWorkerOptions {}
export const createCallbackHandler = (options: CallbackHandlerWebWorkerOptions) => {
	const { worker = self } = options
	const transport = setupMessageTransport(worker)
	const callbackHandler: PrimServerCallbackHandler = prim => {
		const jsonHandler = prim.options.jsonHandler
		transport.on("callback:connect", id => {
			const { rpc: makeRpc } = prim.connected()
			transport.on(`client:message:${id}`, rpc => {
				makeRpc(jsonHandler.parse(rpc as string), detail => {
					transport.send(`server:message:${id}`, jsonHandler.stringify(detail))
				})
			})
			transport.send(`callback:connected:${id}`, null)
		})
	}
	return { callbackHandler, jsonHandler: jsonHandlerPassthrough }
}
// !SECTION

// SECTION Method handler / plugin

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface MethodPluginWebWorkerOptions extends SharedWebWorkerOptions {}
export const createMethodPlugin = (options: MethodPluginWebWorkerOptions) => {
	const { worker = self } = options
	const transport = setupMessageTransport(worker)
	const methodPlugin: PrimClientMethodPlugin = (_endpoint, message, jsonHandler, blobs) =>
		new Promise(resolve => {
			const id = nanoid()
			transport.on(`method:connected:${id}`, () => {
				transport.on(`response:${id}`, result => {
					resolve(jsonHandler.parse(result as string))
				})
				transport.send(`request:${id}`, { rpc: jsonHandler.stringify(message), blobs })
			})
			transport.send("method:connect", id)
		})
	return { methodPlugin, jsonHandler: jsonHandlerPassthrough }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface MethodHandlerWebWorkerOptions extends SharedWebWorkerOptions {}
export const createMethodHandler = (options: MethodHandlerWebWorkerOptions) => {
	const { worker } = options
	const transport = setupMessageTransport(worker)
	const methodHandler: PrimServerMethodHandler = prim => {
		const jsonHandler = prim.options.jsonHandler
		transport.on("method:connect", id => {
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			transport.on(`request:${id}`, async ({ rpc, blobs }) => {
				const result = await prim.server().prepareRpc(jsonHandler.parse(rpc as string), blobs)
				transport.send(`response:${id}`, jsonHandler.stringify(result))
			})
			transport.send(`method:connected:${id}`, null)
		})
	}
	return { methodHandler, jsonHandler: jsonHandlerPassthrough }
}
// !SECTION

// SECTION Message event wrapper

type CallbackEvents = {
	"callback:connect": string
	[connected: `callback:connected:${string}`]: void
	[clientMessage: `client:message:${string}`]: RpcCall | RpcCall[] | string
	[serverMessage: `server:message:${string}`]: RpcAnswer | RpcAnswer[] | string
	[ended: `ended:${string}`]: void
}

type MethodEvents = {
	"method:connect": string
	[connected: `method:connected:${string}`]: void
	[request: `request:${string}`]: { rpc: RpcCall | RpcCall[] | string; blobs?: BlobRecords }
	// NOTE: once binary results can be sent back using blob handlers, blobs should be added to interface below
	// (also note that blob handler isn't needed with structured cloning)
	[response: `response:${string}`]: RpcAnswer | RpcAnswer[] | string
}

type PrimEventDetail = CallbackEvents & MethodEvents
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

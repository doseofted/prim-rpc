// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

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
export const jsonHandler: JsonHandler = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	parse: given => given,
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	stringify: given => given,
	binary: true, // structured cloning is used with this handler
}

interface SharedWebWorkerOptions {
	/** Worker (Dedicated or Shared) or the provided context within a worker (usually `self`) */
	worker: Worker | SharedWorker | Window | WorkerGlobalScope | SharedWorkerGlobalScope | DedicatedWorkerGlobalScope
	/** Optional hint to tell plugin about context when web workers are emulated (for instance, during testing) */
	context?: "WebWorker" | "SharedWorker"
}

// !SECTION

// SECTION Callback handler / plugin

interface CallbackPluginWebWorkerOptions extends SharedWebWorkerOptions {}
export const createCallbackPlugin = (options: CallbackPluginWebWorkerOptions) => {
	const transport = setupMessageTransport(options)
	const callbackPlugin: PrimClientCallbackPlugin = (_endpoint, { connected, response }, jsonHandler) => {
		const id = nanoid()
		transport.on(`callback:connected:${id}`, () => {
			transport.on(`server:message:${id}`, result => {
				// NOTE: result is expected to be string (over network but is likely not over web workers)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				response(jsonHandler.parse(result))
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
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				transport.send(`client:message:${id}`, jsonHandler.stringify(message))
			},
		}
	}
	return callbackPlugin
}

interface CallbackHandlerWebWorkerOptions extends SharedWebWorkerOptions {}
export const createCallbackHandler = (options: CallbackHandlerWebWorkerOptions) => {
	const transport = setupMessageTransport(options)
	const callbackHandler: PrimServerCallbackHandler = prim => {
		const jsonHandler = prim.options.jsonHandler
		transport.on("callback:connect", id => {
			const { rpc: makeRpc } = prim.connected()
			transport.on(`client:message:${id}`, rpc => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				makeRpc(jsonHandler.parse(rpc), detail => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					transport.send(`server:message:${id}`, jsonHandler.stringify(detail))
				})
			})
			transport.send(`callback:connected:${id}`, null)
		})
	}
	return callbackHandler
}
// !SECTION

// SECTION Method handler / plugin

interface MethodPluginWebWorkerOptions extends SharedWebWorkerOptions {}
export const createMethodPlugin = (options: MethodPluginWebWorkerOptions) => {
	const transport = setupMessageTransport(options)
	const methodPlugin: PrimClientMethodPlugin = (_endpoint, message, jsonHandler, blobs) =>
		new Promise(resolve => {
			const id = nanoid()
			transport.on(`method:connected:${id}`, () => {
				transport.on(`response:${id}`, ({ result: resultGiven, blobs }) => {
					const result = jsonHandler.parse(resultGiven) as RpcAnswer | RpcAnswer[]
					resolve({ result, blobs })
				})
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				transport.send(`request:${id}`, { rpc: jsonHandler.stringify(message), blobs })
			})
			transport.send("method:connect", id)
		})
	return methodPlugin
}

interface MethodHandlerWebWorkerOptions extends SharedWebWorkerOptions {}
export const createMethodHandler = (options: MethodHandlerWebWorkerOptions) => {
	const transport = setupMessageTransport(options)
	const methodHandler: PrimServerMethodHandler = prim => {
		transport.on("method:connect", id => {
			transport.on(`request:${id}`, async ({ rpc, blobs }) => {
				const primServer = prim.server()
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const { body: resultGiven, blobs: blobsGiven } = await primServer.call({
					method: "POST",
					body: rpc as string,
					blobs,
				})
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				transport.send(`response:${id}`, { result: resultGiven, blobs: blobsGiven })
			})
			transport.send(`method:connected:${id}`, null)
		})
	}
	return methodHandler
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
	[response: `response:${string}`]: { result: RpcAnswer | RpcAnswer[] | string; blobs?: BlobRecords }
}

type PrimEventDetail = CallbackEvents & MethodEvents
type PrimEventName = keyof PrimEventDetail
type PrimEventStructure<T extends PrimEventName> = { event: T; data: PrimEventDetail[T] }

const ports: MessagePort[] = []

function setupMessageTransport(options: SharedWebWorkerOptions) {
	const { worker, context } = options
	const eventsReceived = mitt<PrimEventDetail>()
	const callback = ({ data: given }: MessageEvent<PrimEventStructure<PrimEventName>>) => {
		// console.log("receive", given.event)
		eventsReceived.emit(given.event, given.data)
	}
	const isWebWorker = typeof Worker !== "undefined" && worker instanceof Worker
	const checkWebContext = (given: unknown): given is DedicatedWorkerGlobalScope =>
		context === "WebWorker" ||
		(typeof DedicatedWorkerGlobalScope !== "undefined" && given instanceof DedicatedWorkerGlobalScope)
	const isWebWorkerContext = checkWebContext(worker)
	if (isWebWorker || isWebWorkerContext) {
		worker.addEventListener("message", callback)
	}
	const isSharedWorker = typeof SharedWorker !== "undefined" && worker instanceof SharedWorker
	if (isSharedWorker) {
		worker.port.addEventListener("message", callback)
		worker.port.start()
	}
	const checkSharedContext = (given: unknown): given is SharedWorkerGlobalScope =>
		context === "SharedWorker" ||
		(typeof SharedWorkerGlobalScope !== "undefined" && given instanceof SharedWorkerGlobalScope)
	const isSharedWorkerContext = checkSharedContext(worker)
	if (isSharedWorkerContext) {
		worker.addEventListener("connect", event => {
			const [port] = event.ports
			if (ports.includes(port)) {
				port.addEventListener("message", callback)
			} else {
				ports.push(port)
				port.addEventListener("message", callback)
				port.start()
			}
		})
	}
	return {
		on<T extends PrimEventName>(event: T, cb: (data: PrimEventDetail[T]) => void) {
			eventsReceived.on(event, cb)
			return () => eventsReceived.off(event, cb)
		},
		send<T extends PrimEventName>(event: T, data: PrimEventDetail[T]) {
			// console.log("send", event)
			if (isWebWorker || isWebWorkerContext) {
				worker.postMessage({ event, data })
			}
			if (isSharedWorker) {
				worker.port.postMessage({ event, data })
			}
			if (isSharedWorkerContext) {
				for (const port of ports) {
					port.postMessage({ event, data })
				}
			}
		},
		destroy() {
			eventsReceived.all.clear()
			if (isWebWorker || isWebWorkerContext) {
				worker.removeEventListener("message", callback)
			}
			if (isSharedWorker) {
				worker.port.removeEventListener("message", callback)
			}
			if (isSharedWorkerContext) {
				for (const port of ports) {
					port.removeEventListener("message", callback)
				}
			}
		},
	}
}

// !SECTION

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
import { nanoid } from "nanoid"
import mitt from "mitt"
import { get as getProperty, remove as removeFromArray } from "lodash-es"
import type { Asyncify } from "type-fest"
import { RpcCall, PrimOptions, RpcAnswer, PrimWebSocketEvents, PrimHttpEvents, QueuedHttpCall, PromiseResolveStatus } from "./interfaces"
import { createPrimOptions } from "./options"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any
type PromisifiedModule<ModuleGiven extends object> = {
	[Key in keyof ModuleGiven]: ModuleGiven[Key] extends AnyFunction
		? Asyncify<ModuleGiven[Key]>
		: ModuleGiven[Key] extends object
			? PromisifiedModule<ModuleGiven[Key]>
			: ModuleGiven[Key]
}
/** Callback prefix */
const CB_PREFIX = "_cb_"

// NOTE: `options.server` is useless, just detect if module is given and set internal flag that client is used on server
// NOTE: add presets option for dev and production to configure which fallback settings to use when not provided

/**
 * Prim-RPC can be used to write plain functions on the server and then call them easily from the client.
 * On the server, Prim-RPC is given parameters from a server framework to find the designated function on each request.
 * On the client, Prim-RPC translates each function call into an RPC that Prim-RPC can understand from the server.
 * 
 * @param options Options for utilizing functions provided with Prim
 * @param givenModule If `options.server` is true, provide the module where functions should be resolved
 * @returns A wrapper function around the given module or type definitions used for calling functions from server
 */
export function createPrimClient<T extends object = object>(options?: PrimOptions, givenModule?: T): PromisifiedModule<T> {
	const configured = createPrimOptions(options)
	// SECTION Proxy to handle function calls
	const proxy = new ProxyDeep<T>(givenModule, {
		apply(_target, targetContext, args: unknown[]) {
			// SECTION Server-side module handling
			const targetFunction = getProperty<T, keyof T>(givenModule, this.path as [keyof T])
			const targetIsCallable = typeof targetFunction === "function"
			if (targetIsCallable) {
				// if an argument is a callback reference, the created callback below will send the result back to client
				const argsWithListeners = args.map(arg => {
					const argIsReferenceToCallback = typeof arg === "string" && arg.startsWith(CB_PREFIX)
					if (!argIsReferenceToCallback) { return arg }
					return (...cbArgs: unknown[]) => {
						wsEvent.emit("response", { result: cbArgs, id: arg })
					}
				})
				const functionResult = Reflect.apply(targetFunction, targetContext, argsWithListeners) as unknown
				return functionResult
			}
			// !SECTION
			// SECTION Client-side module handling
			let callbacksWereGiven = false
			args = args.map((arg) => {
				const callbackArg = typeof arg === "function" ? arg : false
				if (callbackArg) { callbacksWereGiven = true } else { return arg }
				const callbackReferenceIdentifier = [CB_PREFIX, nanoid()].join("")
				const handleRpcCallbackResult = (msg: RpcAnswer) => {
					if (msg.id !== callbackReferenceIdentifier) { return }
					const targetArgs = Array.isArray(msg.result) ? msg.result : [msg.result]
					Reflect.apply(callbackArg, undefined, targetArgs)
					// if (Array.isArray(msg.result)) {
					// 	callbackArg(...msg.result as unknown[])
					// } else {
					// 	callbackArg(msg.result)
					// }
					// NOTE: it's hard to unbind until I know that callback won't fire anymore
					// wsEvent.off("response", handleRpcCallbackResult)
				}
				wsEvent.on("response", handleRpcCallbackResult)
				return callbackReferenceIdentifier
			})
			const rpc: RpcCall = { method: this.path.join("/"), params: args, id: nanoid() }
			if (callbacksWereGiven) {
				sendMessage(rpc)
				// TODO: primServer doesn't seem to respond with callback results unless I send HTTP request first (find out why)
				// TODO: once fixed, I can return in this block and avoid extra HTTP request 
				// return
			}
			const result = new Promise<RpcAnswer>((resolve, reject) => {
				httpEvent.on("response", (answer) => {
					if (rpc.id !== answer.id) { return }
					if (answer.error) {
						// TODO: remove usage of RpcError elsewhere in Prim and, from server, serialize
						// instances of `Error` and fallback to custom JSON handler if provided to serialize errors
						reject(answer.error)
					} else {
						resolve(answer.result as unknown)
					}
				})
			})
			httpEvent.emit("queue", { rpc, result, resolved: PromiseResolveStatus.UNHANDLED })
			return result
			// !SECTION
		},
		get(_target, _prop, _receiver) {
			return this.nest(() => undefined)
		},
	})
	// !SECTION
	// SECTION: WebSocket event handling
	const wsEvent = configured.internal.event ?? mitt<PrimWebSocketEvents>()
	function createWebsocket(initialMessage: RpcCall) {
		const response = (given: RpcAnswer) => {
			wsEvent.emit("response", given)
		}
		const ended = () => {
			sendMessage = createWebsocket
			wsEvent.emit("ended")
		}
		const connected = () => {
			// NOTE connect event should only happen once so initial message will be sent then
			send(initialMessage)
			wsEvent.emit("connected")
		}
		const wsEndpoint = configured.wsEndpoint || configured.endpoint.replace(/^http(s?)/g, "ws$1")
		const { send } = configured.socket(wsEndpoint, { connected, response, ended }, configured.jsonHandler)
		sendMessage = send
	}
	/** Sets up WebSocket if needed otherwise sends a message over websocket */
	let sendMessage: (message: RpcCall) => void = createWebsocket
	// !SECTION
	// SECTION: batched HTTP events
	const queuedCalls: QueuedHttpCall[] = []
	const httpEvent = mitt<PrimHttpEvents>()
	let timer: ReturnType<typeof setTimeout>
	// when an RPC is added to the list, prepare request to be sent to server (either immediately or in a batch)
	httpEvent.on("queue", (given) => {
		queuedCalls.push(given)
		batchedRequests()
	})
	const batchedRequests = () => {
		if (timer) { return }
		timer = setTimeout(() => {
			const rpcList = queuedCalls.filter(c => c.resolved === PromiseResolveStatus.UNHANDLED)
			rpcList.forEach(r => { r.resolved = PromiseResolveStatus.PENDING })
			clearTimeout(timer); timer = undefined
			const rpcCallList = rpcList.map(r => r.rpc)
			const { endpoint, jsonHandler } = configured
			const rpcCallOrCalls = rpcCallList.length === 1 ? rpcCallList[0] : rpcCallList
			configured.client(endpoint, rpcCallOrCalls, jsonHandler).then(answers => {
				// return either the single result or the batched results to caller
				if (Array.isArray(answers)) {
					answers.forEach(answer => { httpEvent.emit("response", answer) })
				} else {
					const answer = answers
					httpEvent.emit("response", answer)
				}
			}).catch((errors: RpcAnswer[]) => {
				if (Array.isArray(errors)) {
					// multiple errors given, return each error result to caller
					errors.forEach(error => { httpEvent.emit("response", error) })
				} else {
					// one error was given but there may be multiple results, return that error to caller
					rpcList.forEach(r => {
						const error = errors
						const id = r.rpc.id
						httpEvent.emit("response", { id, error })
					})
				}
			}).finally(() => {
				// mark all RPC in this list as resolved so they can be removed, without removing other pending requests
				rpcList.forEach(r => { r.resolved = PromiseResolveStatus.YES })
				removeFromArray(queuedCalls, given => given.resolved === PromiseResolveStatus.YES)
			})
		}, configured.clientBatchTime)
	}
	// !SECTION
	return proxy as PromisifiedModule<T>
}

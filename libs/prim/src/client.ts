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
import { RpcCall, PrimOptions, RpcAnswer, PrimWebSocketEvents, PrimHttpEvents, PromiseResolveStatus, PrimHttpQueueItem } from "./interfaces"
import { createPrimOptions } from "./options"
import { deserializeError } from "serialize-error"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...args: any[]) => any
type PromisifiedModule<ModuleGiven extends object> = {
	[Key in keyof ModuleGiven]: ModuleGiven[Key] extends AnyFunction
		? Asyncify<ModuleGiven[Key]>
		: ModuleGiven[Key] extends object
			? PromisifiedModule<ModuleGiven[Key]>
			: ModuleGiven[Key]
}
/** Callback prefix */ const CB_PREFIX = "_cb_"

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
export function createPrimClient<
	ModuleType extends OptionsType["module"] = object,
	OptionsType extends PrimOptions = PrimOptions,
>(options?: OptionsType): PromisifiedModule<ModuleType> {
	const configured = createPrimOptions(options)
	const givenModule = configured.module as ModuleType
	// SECTION Proxy to handle function calls
	const proxy = new ProxyDeep<ModuleType>(givenModule ?? ({} as ModuleType), {
		apply(_target, targetContext, args: unknown[]) {
			// SECTION Server-side module handling
			const targetFunction = getProperty<ModuleType, keyof ModuleType>(givenModule, this.path as [keyof ModuleType])
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
			const params = args.map((arg) => {
				const callbackArg = typeof arg === "function" ? arg : false
				if (callbackArg) { callbacksWereGiven = true } else { return arg }
				const callbackReferenceIdentifier = [CB_PREFIX, nanoid()].join("")
				const handleRpcCallbackResult = (msg: RpcAnswer) => {
					if (msg.id !== callbackReferenceIdentifier) { return }
					const targetArgs = Array.isArray(msg.result) ? msg.result : [msg.result]
					Reflect.apply(callbackArg, undefined, targetArgs)
					// NOTE: it's hard to unbind until I know that callback won't fire anymore
					wsEvent.on("ended", () => {
						wsEvent.off("response", handleRpcCallbackResult)
					})
				}
				wsEvent.on("response", handleRpcCallbackResult)
				return callbackReferenceIdentifier
			})
			const rpc: RpcCall = { method: this.path.join("/"), params, id: nanoid() }
			if (callbacksWereGiven) {
				// TODO: add fallback in case client cannot support websocket
				const result = new Promise<RpcAnswer>((resolve, reject) => {
					wsEvent.on("response", (answer) => {
						if (rpc.id !== answer.id) { return }
						if (answer.error) {
							reject(answer.error)
						} else {
							resolve(answer.result)
						}
					})
				})
				sendMessage(rpc)
				return result
			}
			const result = new Promise<RpcAnswer>((resolve, reject) => {
				httpEvent.on("response", (answer) => {
					if (rpc.id !== answer.id) { return }
					if (answer.error) {
						if (configured.handleError) {
							answer.error = deserializeError(answer.error)
						}
						reject(answer.error)
					} else {
						resolve(answer.result)
					}
				})
			})
			httpEvent.emit("queue", { rpc, result, resolved: PromiseResolveStatus.Unhandled })
			return result
			// !SECTION
		},
		get(_target, _prop, _receiver) {
			return this.nest(() => undefined)
		},
	})
	// !SECTION
	// SECTION: WebSocket event handling
	const wsEvent = configured.internal.socketEvent ?? mitt<PrimWebSocketEvents>()
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
			wsEvent.emit("connected")
			send(initialMessage)
		}
		const wsEndpoint = configured.wsEndpoint || configured.endpoint.replace(/^http(s?)/g, "ws$1")
		const { send } = configured.socket(wsEndpoint, { connected, response, ended }, configured.jsonHandler)
		sendMessage = send
	}
	/** Sets up WebSocket if needed otherwise sends a message over websocket */
	let sendMessage: (message: RpcCall) => void = createWebsocket
	// !SECTION
	// SECTION: batched HTTP events
	const queuedCalls: PrimHttpQueueItem[] = []
	const httpEvent = configured.internal.clientEvent ?? mitt<PrimHttpEvents>()
	let timer: ReturnType<typeof setTimeout>
	// when an RPC is added to the list, prepare request to be sent to server (either immediately or in a batch)
	httpEvent.on("queue", (given) => {
		queuedCalls.push(given)
		batchedRequests()
	})
	const batchedRequests = () => {
		if (timer) { return }
		timer = setTimeout(() => {
			const rpcList = queuedCalls.filter(c => c.resolved === PromiseResolveStatus.Unhandled)
			rpcList.forEach(r => { r.resolved = PromiseResolveStatus.Pending })
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
				rpcList.forEach(r => { r.resolved = PromiseResolveStatus.Resolved })
				removeFromArray(queuedCalls, given => given.resolved === PromiseResolveStatus.Resolved)
			})
		}, configured.clientBatchTime)
	}
	// !SECTION
	const client = proxy as PromisifiedModule<ModuleType>
	return client
}

// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

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
import mitt from "mitt"
import { nanoid } from "nanoid"
import getProperty from "just-safe-get"
import removeFromArray from "just-remove"
import { deserializeError } from "serialize-error"
import { createPrimOptions, primMajorVersion, useVersionInRpc } from "./options"
import { extractBlobData, mergeBlobData } from "./extract/blobs"
import { PromiseResolveStatus } from "./interfaces"
import type {
	PromisifiedModule,
	RpcCall,
	PrimOptions,
	RpcAnswer,
	PrimWebSocketEvents,
	PrimHttpEvents,
	PrimHttpQueueItem,
	BlobRecords,
	JsonHandler,
} from "./interfaces"
import { CB_PREFIX, PROMISE_PREFIX } from "./constants"
import { extractPromisePlaceholders } from "./extract/promises"

export type PrimClient<ModuleType extends PrimOptions["module"]> = PromisifiedModule<ModuleType>
// export interface PrimClient<ModuleType extends PrimOptions["module"]> {
// 	client: PromisifiedModule<ModuleType>
// 	destroy: () => void
// }

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
	JsonHandlerType extends OptionsType["jsonHandler"] = JsonHandler,
	OptionsType extends PrimOptions = PrimOptions<Partial<ModuleType>, JsonHandlerType>,
>(options?: OptionsType): PrimClient<ModuleType> {
	const methodPluginGiven = typeof options?.methodPlugin !== "undefined"
	const callbackPluginGiven = typeof options?.callbackPlugin !== "undefined"
	const configured = createPrimOptions(options as unknown as PrimOptions)
	const binaryHandlingNeeded = configured.handleBlobs || !configured.jsonHandler?.binary
	const givenModulePromise = (typeof configured.module === "function" ? configured.module() : configured.module) as
		| ModuleType
		| Promise<ModuleType>
	// Once promise and possible wrapper function are removed from module, store to avoid unwrapping again unnecessarily
	let determinedModule: ModuleType
	// SECTION Proxy to handle function calls
	const proxy = new ProxyDeep(
		{},
		{
			apply(_target, targetContext, givenArgs: unknown[]) {
				// NOTE: client could've been given either Promise or function that resolves to Promise (dynamic imports)
				function applySync(givenPath: string[], givenModule: ModuleType, targetContext: unknown, givenArgs: unknown[]) {
					const functionName = givenPath.join("/")
					const preRequestResult = configured.preRequest
						? configured.preRequest(givenArgs, functionName) ?? { args: givenArgs }
						: { args: givenArgs }
					if (configured.preRequest && "result" in preRequestResult) {
						return configured.postRequest(preRequestResult.result, functionName)
					}
					const { args: argsProcessed } = preRequestResult
					// SECTION Server-side module handling
					const targetFunction = getProperty(givenModule, givenPath) as ModuleType
					const targetIsCallable = typeof targetFunction === "function"
					if (targetIsCallable) {
						// if an argument is a callback reference, the created callback below will send the result back to client
						const argsWithListeners = argsProcessed.map(arg => {
							const argIsReferenceToCallback = typeof arg === "string" && arg.startsWith(CB_PREFIX)
							if (!argIsReferenceToCallback) {
								return arg
							}
							return (...cbArgs: unknown[]) => {
								wsEvent.emit("response", { result: cbArgs, id: arg })
								// NOTE: today, callbacks can be called but server cannot see return value given by client
								// TODO: when callback given to method defined on client returns value, emit event to server
								// TODO: listen for callback return value on server, return value to called method as callback return value
								// NOTE: return value of callback on server will have to be awaited since result is from client
							}
						})
						const functionResult = Reflect.apply(targetFunction, targetContext, argsWithListeners)
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
						const functionResultProcessed = configured.postRequest
							? configured.postRequest(functionResult, functionName)
							: functionResult
						return configured.postRequest && typeof functionResultProcessed === "undefined"
							? functionResult
							: functionResultProcessed
					}
					// !SECTION
					// SECTION Client-side module handling
					let callbacksWereGiven = false
					const blobs: BlobRecords = {}
					const args = argsProcessed.map(arg => {
						if (binaryHandlingNeeded) {
							const [replacedArg, newBlobs, givenFromFormElement] = extractBlobData(arg)
							const blobEntries = Object.entries(newBlobs)
							for (const [key, val] of blobEntries) {
								blobs[key] = val
							}
							if (givenFromFormElement || blobEntries.length > 0) {
								return replacedArg
							}
						}
						const callbackArg = typeof arg === "function" ? arg : false
						if (!callbackArg) {
							return arg
						}
						callbacksWereGiven = true
						const callbackReferenceIdentifier = [CB_PREFIX, nanoid()].join("")
						const handleRpcCallbackResult = (msg: RpcAnswer) => {
							if (msg.id !== callbackReferenceIdentifier) {
								return
							}
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
					const rpcBase: Partial<RpcCall> = useVersionInRpc ? { prim: primMajorVersion } : {}
					const rpc: RpcCall = { ...rpcBase, method: functionName, args: args, id: nanoid() }
					if ((callbackPluginGiven && callbacksWereGiven) || !methodPluginGiven) {
						// TODO: add fallback in case client cannot support websocket
						const result = new Promise<RpcAnswer>((resolve, reject) => {
							const promiseEvents = mitt<Record<string | number, unknown>>()
							wsEvent.on("response", answer => {
								if (answer.id.toString().startsWith(PROMISE_PREFIX)) {
									promiseEvents.emit(answer.id, answer.result)
									promiseEvents.off(answer.id)
									return
								}
								if (rpc.id !== answer.id) {
									return
								}
								if (answer.error) {
									// TODO: if callback result, handle potential Errors (as given in options)
									reject(answer.error)
								} else {
									const resultWithPromises = extractPromisePlaceholders(
										answer.result,
										(promiseId, resolvePromise) => {
											promiseEvents.on(promiseId, given => {
												resolvePromise(given)
											})
										},
										options?.flags?.supportMultiplePromiseResults
									)
									resolve(resultWithPromises)
								}
							})
						})
						sendMessage(rpc, blobs)
						return result
							.then(functionResult => {
								const functionResultProcessed = configured.postRequest
									? configured.postRequest(functionResult, functionName)
									: functionResult
								return configured.postRequest && typeof functionResultProcessed === "undefined"
									? functionResult
									: functionResultProcessed
							})
							.catch(error => {
								// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
								const functionResultProcessed = configured.postRequest
									? configured.postRequest(error, functionName)
									: error
								throw configured.postRequest && typeof functionResultProcessed === "undefined"
									? error
									: functionResultProcessed
							})
					}
					// TODO: consider extending Promise to include methods like `.refetch()` or `.stopListening()` (for callbacks)
					// NOTE: if promises are extended, this also needs to be done on results returned with callbacks (above)
					// NOTE: If I ever decide to chain methods, those methods would also have to extend the Promise
					const result = new Promise<RpcAnswer>((resolve, reject) => {
						httpEvent.on("response", answer => {
							if (rpc.id !== answer.id) {
								return
							}
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
					httpEvent.emit("queue", { rpc, result, blobs, resolved: PromiseResolveStatus.Unhandled })
					return result
						.then(functionResult => {
							const functionResultProcessed = configured.postRequest
								? configured.postRequest(functionResult, functionName)
								: functionResult
							return configured.postRequest && typeof functionResultProcessed === "undefined"
								? functionResult
								: functionResultProcessed
						})
						.catch(error => {
							// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
							const functionResultProcessed = configured.postRequest
								? configured.postRequest(error, functionName)
								: error
							throw configured.postRequest && typeof functionResultProcessed === "undefined"
								? error
								: functionResultProcessed
						})
					// !SECTION
				}
				if (determinedModule) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					return applySync(this.path, determinedModule, targetContext, givenArgs)
				}
				if (givenModulePromise instanceof Promise) {
					return givenModulePromise.then(givenModule => {
						determinedModule = givenModule
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
						return applySync(this.path, determinedModule, targetContext, givenArgs)
					})
				} else {
					determinedModule = givenModulePromise
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					return applySync(this.path, determinedModule, targetContext, givenArgs)
				}
			},
			get(_target, _prop, _receiver) {
				return this.nest(() => undefined)
			},
		}
	)
	// !SECTION
	// SECTION: WebSocket event handling
	const wsEvent = configured.internal.socketEvent ?? mitt<PrimWebSocketEvents>()
	const wsDestroyedEvents: (() => void)[] = []
	function createWebsocket(initialMessage: RpcCall, initialBlobs: BlobRecords) {
		const response = (given: RpcAnswer) => {
			wsEvent.emit("response", given)
		}
		const ended = () => {
			sendMessage = createWebsocket
			wsEvent.emit("ended")
			wsDestroyedEvents.length = 0
		}
		const connected = () => {
			// NOTE connect event should only happen once so initial message will be sent then
			wsEvent.emit("connected")
			send(initialMessage, initialBlobs)
		}
		const wsEndpoint = configured.wsEndpoint || configured.endpoint.replace(/^http(s?)/g, "ws$1")
		const { send, close } = configured.callbackPlugin(
			wsEndpoint,
			{ connected, response, ended },
			configured.jsonHandler
		)
		wsDestroyedEvents.push(close)
		sendMessage = send
	}
	/** Sets up WebSocket if needed otherwise sends a message over websocket */
	let sendMessage: (message: RpcCall, blobs: BlobRecords) => void = createWebsocket
	// !SECTION
	// SECTION: batched HTTP events
	const queuedCalls: PrimHttpQueueItem[] = []
	const httpEvent = configured.internal.clientEvent ?? mitt<PrimHttpEvents>()
	let timer: ReturnType<typeof setTimeout>
	// when an RPC is added to the list, prepare request to be sent to server (either immediately or in a batch)
	httpEvent.on("queue", given => {
		queuedCalls.push(given)
		batchedRequests()
	})
	const batchedRequests = () => {
		function handleRpcCallsMethodPlugin() {
			const rpcList = queuedCalls.filter(c => c.resolved === PromiseResolveStatus.Unhandled)
			rpcList.forEach(r => {
				r.resolved = PromiseResolveStatus.Pending
			})
			clearTimeout(timer)
			timer = undefined
			const rpcCallList = rpcList.map(r => r.rpc)
			const blobs: BlobRecords = {}
			Object.assign(blobs, ...rpcList.map(r => r.blobs))
			const { endpoint, jsonHandler } = configured
			const rpcCallOrCalls = rpcCallList.length === 1 ? rpcCallList[0] : rpcCallList
			configured
				.methodPlugin(endpoint, rpcCallOrCalls, jsonHandler, blobs)
				.then(answersAll => {
					// FIXME: server should be given location of blob in object for optimized merging
					// for example, a file using key _bin_hello123.file.test would merge with RPC at .file.test path
					const { result: answers, blobs: givenBlobs = {} } = answersAll
					// return either the single result or the batched results to caller
					if (Array.isArray(answers)) {
						answers.forEach(answer => {
							const answerMerged = binaryHandlingNeeded ? mergeBlobData(answer, givenBlobs) : answer
							httpEvent.emit("response", answerMerged)
						})
					} else {
						const answer = answers
						const answerMerged = binaryHandlingNeeded ? mergeBlobData(answer, givenBlobs) : answer
						httpEvent.emit("response", answerMerged)
					}
				})
				.catch((errors: RpcAnswer[]) => {
					if (Array.isArray(errors)) {
						// multiple errors given, return each error result to caller
						errors.forEach(error => {
							httpEvent.emit("response", error)
						})
					} else {
						// one error was given but there may be multiple results, return that error to caller
						// TODO: ensure only errored results are thrown and others resolve (when calls are batched)
						rpcList.forEach(r => {
							const error = errors
							const id = r.rpc.id
							httpEvent.emit("response", { id, error })
						})
					}
				})
				.finally(() => {
					// mark all RPC in this list as resolved so they can be removed, without removing other pending requests
					rpcList.forEach(r => {
						r.resolved = PromiseResolveStatus.Resolved
					})
					const toBeRemoved = queuedCalls.filter(given => given.resolved === PromiseResolveStatus.Resolved)
					removeFromArray(queuedCalls, toBeRemoved)
				})
		}
		if (configured.clientBatchTime === 0) {
			handleRpcCallsMethodPlugin()
			return
		}
		if (timer) {
			return
		}
		timer = setTimeout(handleRpcCallsMethodPlugin, configured.clientBatchTime)
	}
	// !SECTION
	const client = proxy as PromisifiedModule<ModuleType>
	// function destroy() {
	// 	wsDestroyedEvents.forEach(shutDown => shutDown())
	// 	wsEvent.all.clear()
	// 	httpEvent.all.clear()
	// }
	// return { client, destroy }

	// NOTE: if additional methods are added to the return value, consider adding method that to the proxy itself
	// so that function calls can always be located on the root of the return value (prefix with underscore so that it's
	// easy to differentiate between Prim method and function call)
	return client
}

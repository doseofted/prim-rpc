// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import getProperty from "just-safe-get"
import mitt from "mitt"
import queryString from "query-string"
import { serializeError } from "serialize-error"
import { createPrimOptions, primMajorVersion, useVersionInRpc } from "./options"
import { createPrimClient } from "./client"
import { extractBlobData, mergeBlobData } from "./extract/blobs"
import { PrimRpcSpecific, checkHttpLikeRequest, checkHttpLikeResponse, checkRpcCall, checkRpcResult } from "./validate"
import type {
	AnyFunction,
	BlobRecords,
	JsonHandler,
	CommonServerSimpleGivenOptions,
	CommonServerResponseOptions,
	PrimServerOptions,
	PrimWebSocketEvents,
	RpcAnswer,
	RpcCall,
	PrimServerSocketAnswer,
	PrimServerSocketEvents,
	PrimServerActionsBase,
	PrimHttpEvents,
	PrimServerEvents,
	PrimServer,
	PrimServerSocketAnswerRpc,
} from "./interfaces"
import { extractPromiseData } from "./extract/promises"
import { checkRpcIdentifier, getFunctionRpcProperty } from "./allow"

/**
 *
 * @param options Options for Prim server, including client options
 * @returns A `client` used for RPC calls, `configured` settings for Prim Server,
 * and event handlers for generic events used when making WS/HTTP calls
 */
function createPrimInstance(options?: PrimServerOptions) {
	const configured = createPrimOptions(options)
	if (!configured.internal.clientEvent) {
		configured.internal.clientEvent = mitt<PrimHttpEvents>()
	}
	if (!configured.internal.socketEvent) {
		configured.internal.socketEvent = mitt<PrimWebSocketEvents>()
	}
	const client = createPrimClient(configured)
	const { socketEvent, clientEvent } = configured.internal
	return { client, socketEvent, clientEvent, configured }
}

const denyList = [
	"prototype",
	"__proto__",
	"constructor",
	"toString",
	"toLocaleString",
	"valueOf",
	"apply",
	"bind",
	"call",
	"arguments",
	"caller",
]

function createServerActions(
	serverOptions: PrimServerOptions,
	instance?: ReturnType<typeof createPrimInstance>
): PrimServerActionsBase {
	const { jsonHandler, prefix: serverPrefix, handleError, handleBlobs } = serverOptions
	const binaryHandlingNeeded = handleBlobs || !jsonHandler?.binary
	return {
		prepareCall(given = {}) {
			try {
				const givenReq = checkHttpLikeRequest(given, jsonHandler?.binary)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const { body, method, url: possibleUrl, blobs } = givenReq
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const providedBody = method === "POST" && body
				if (providedBody) {
					const prepared = jsonHandler.parse(givenReq.body) as RpcCall | RpcCall[]
					const possibleCalls = Array.isArray(prepared) ? checkRpcCall(prepared) : [checkRpcCall(prepared)]
					if (binaryHandlingNeeded && Object.entries(blobs || {}).length > 0) {
						for (const toCall of possibleCalls) {
							toCall.args = toCall.args.map(arg => mergeBlobData(arg, blobs))
						}
					}
					return Array.isArray(prepared) ? possibleCalls : possibleCalls[0]
				}
				const providedUrl = method === "GET" && possibleUrl
				if (providedUrl) {
					const positional = []
					const { query, url } = queryString.parseUrl(possibleUrl, {
						arrayFormat: "comma",
						parseBooleans: true,
						parseNumbers: true,
					})
					const id: string | number = "-" in query && !Array.isArray(query["-"]) ? query["-"] : undefined
					delete query["-"]
					const entries = Object.entries(query)
					// determine if positional arguments were given (must start at 0, none can be missing)
					for (const [possibleIndex, value] of entries) {
						const index = Number.parseInt(possibleIndex, 10)
						if (Number.isNaN(index)) {
							break
						}
						const nextIndex = index === 0 || typeof positional[index - 1] !== "undefined"
						if (!nextIndex) {
							break
						}
						positional[index] = value
					}
					const args =
						positional.length > 0 && positional.length === entries.length
							? positional
							: entries.length === 0
								? []
								: query
					let method = url.replace(RegExp("^" + serverPrefix + "\\/?"), "")
					method = method !== "" ? method : "default"
					return checkRpcCall({ id, method, args })
				}
				throw { error: "Response can not be generated from request" }
			} catch (error) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				if (typeof error === "object" && "primRpc" in error && error.primRpc === PrimRpcSpecific) {
					// FIXME: errors aren't expected to be thrown here but is needed for next step
					// use same pattern from Prim RPC client to handle special objects
					const internalError: RpcCall = { method: "_error_", args: error }
					return internalError
				}
				// RPC call is purposefully invalid to trigger invalid RPC error in next step
				return { method: "" }
			}
		},
		async prepareRpc(calls, context, httpMethod) {
			// FIXME: checkRpcCall is called twice (once in prepareCall and once here) and this could be optimized
			// NOTE: new Prim client should be created on each request so callback results are not shared
			try {
				const { client, socketEvent: event, configured } = instance ?? createPrimInstance(serverOptions)
				const callList = Array.isArray(calls) ? calls : [calls]
				const answeringCalls = callList.map(async (givenUnchecked): Promise<RpcAnswer> => {
					const { method, args /* : argsGiven */, id } = checkRpcCall(givenUnchecked)
					// const args = Object.entries(blobs || {}).length > 0 ? argsGiven.map(arg => mergeBlobLikeWithGiven(arg, blobs)) : argsGiven
					if (method === "_error_") {
						throw args[0] // from internal prepareCall step
					}
					const rpcVersion: Partial<RpcAnswer> = useVersionInRpc ? { prim: primMajorVersion } : {}
					const rpcBase: Partial<RpcAnswer> = { ...rpcVersion, id }
					try {
						const methodExpanded = method.split("/")
						// using `configured.module` if module was provided directly to server
						// and resolve given module first if it was dynamically imported
						const givenModulePromise = (
							typeof configured.module === "function" ? configured.module() : configured.module
						) as PrimServerOptions["module"] | Promise<PrimServerOptions["module"]>
						const givenModule = givenModulePromise instanceof Promise ? await givenModulePromise : givenModulePromise
						const targetLocal = getProperty(givenModule, methodExpanded) as AnyFunction & { rpc?: boolean }
						let possiblyMethodOnMethod = false
						if (givenModule) {
							// While subsequent checks cover these situations, some key props will immediately invalidate a given method
							if (denyList.filter(given => methodExpanded.includes(given)).length > 0) {
								return { ...rpcBase, error: "Method was not valid" }
							}
							// these checks only apply if module is provided directly (determined on actual server with module)
							if (methodExpanded.length > 1) {
								const currentPathCheck: string[] = []
								// NOTE: `.methodsOnMethods` is only allowed if method is defined _directly_ on another method
								const previousPathsIncludeFunction = methodExpanded
									.slice(0, Object.keys(serverOptions.methodsOnMethods).length > 0 ? -2 : -1)
									.map(method => {
										currentPathCheck.push(method)
										const currentPath = getProperty(givenModule, currentPathCheck) as unknown
										return typeof currentPath !== "object" // paths cannot contain "function" type any other type
									})
									.reduce((a, b) => a || b, false)
								if (previousPathsIncludeFunction) {
									return { ...rpcBase, error: "Method on method was not valid" }
								}
								const directPreviousPath = getProperty(givenModule, methodExpanded.slice(0, -1)) as unknown
								const rpcSpecifierForMethodOnMethod = serverOptions.methodsOnMethods[methodExpanded.slice(-1)[0]]
								if (typeof directPreviousPath === "function" && !rpcSpecifierForMethodOnMethod) {
									const rpcAllowedForMethodOnMethod = checkRpcIdentifier(rpcSpecifierForMethodOnMethod, httpMethod)
									if (!rpcAllowedForMethodOnMethod) {
										return { ...rpcBase, error: "Method on method was not allowed" }
									}
								}
								const rpcProperty = getFunctionRpcProperty(directPreviousPath)
								possiblyMethodOnMethod = checkRpcIdentifier(rpcProperty, httpMethod)
							}
							if (typeof targetLocal === "undefined" || targetLocal === null) {
								return { ...rpcBase, error: "Method was not found" }
							}
							if (typeof targetLocal !== "function") {
								return { ...rpcBase, error: "Method was not callable" }
							}
							const rpcProperty = getFunctionRpcProperty(targetLocal)
							const methodAllowedDirectly = checkRpcIdentifier(rpcProperty, httpMethod)
							if (!methodAllowedDirectly) {
								const allowListValueForMethod =
									Object.entries(serverOptions.allowList ?? {}).length > 0 &&
									(getProperty(serverOptions.allowList, methodExpanded) as unknown)
								const rpcPropertyFromAllowList =
									typeof allowListValueForMethod === "string" || typeof allowListValueForMethod === "boolean"
										? allowListValueForMethod
										: false
								const allowedInSchema = checkRpcIdentifier(rpcPropertyFromAllowList, httpMethod)
								if (!allowedInSchema && !possiblyMethodOnMethod) {
									return { ...rpcBase, error: "Method was not allowed" }
								}
							}
						}
						// NOTE: use `targetRemote` below even if target is local to allow callbacks to be used with server
						// (server and client share event handlers on `.internal` option that allows for usage of callbacks)
						if (givenModule && targetLocal) {
							// The module was provided and the target exists. Checks have already run and did not return an error
							// so we can call the method using the client.
							// call module with `client` if not provided directly to server (checks already ran on module, if provided)
							const targetRemote = getProperty(client, methodExpanded) as AnyFunction & { rpc?: boolean }
							const preCallResult = configured.preCall ? configured.preCall(args, targetLocal) ?? { args } : { args }
							if (configured.preCall && "result" in preCallResult) {
								return { ...rpcBase, result: await preCallResult.result }
							}
							const { args: processedArgs } = preCallResult
							const result = (await Reflect.apply(targetRemote, context, processedArgs)) as unknown
							const [resultExtracted, promisesRecord] = extractPromiseData(
								result,
								serverOptions?.flags?.supportMultiplePromiseResults
							)
							Object.entries(promisesRecord).forEach(async ([id, promise]) => {
								try {
									const result = await promise
									event.emit("response", { id, result })
								} catch (e) {
									if (handleError && e instanceof Error) {
										const error = serializeError<unknown>(e)
										if (!serverOptions.showErrorStack) {
											delete error.stack
										}
										return { id, error }
									}
									event.emit("response", { id, error: e })
								}
							})
							const functionResultProcessed = configured.postCall
								? configured.postCall(resultExtracted, targetLocal)
								: resultExtracted
							return configured.postCall && typeof functionResultProcessed === "undefined"
								? { ...rpcBase, result: resultExtracted }
								: { ...rpcBase, result: await functionResultProcessed }
						} else {
							// If either the module wasn't provided or target doesn't exist (even if module does), send a request using
							// a client that doesn't know about the module provided (will use provided plugin to server).
							const { module: _moduleProvided, ...limitedOptions } = serverOptions
							// create client that doesn't have access to module (target may not exist but other targets might)
							const { client: limitedClient } = createPrimInstance(limitedOptions)
							const targetRemote = getProperty(limitedClient, methodExpanded) as AnyFunction & { rpc?: boolean }
							// const targetLocal = getProperty(givenModule, methodExpanded) as AnyFunction & { rpc?: boolean }
							// const processedArgs = preprocess(...args).bind(targetLocal)
							const preCallResult = configured.preCall ? configured.preCall(args) ?? { args } : { args }
							if (configured.preCall && "result" in preCallResult) {
								return { ...rpcBase, result: await preCallResult.result }
							}
							const { args: processedArgs } = preCallResult
							const result = (await Reflect.apply(targetRemote, context, processedArgs)) as unknown
							const functionResultProcessed = configured.postCall ? configured.postCall(result) : result
							return configured.postCall && typeof functionResultProcessed === "undefined"
								? { ...rpcBase, result: result }
								: { ...rpcBase, result: await functionResultProcessed }
						}
						// TODO: today, result must be supported by JSON handler but consider supporting returned functions
						// in the same way that callback are supported today (by passing reference to client)
					} catch (e) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						const errorProcessed = configured.postCall ? configured.postCall(e) : e
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						const errorProcessedReady =
							configured.postCall && typeof errorProcessed === "undefined" ? e : errorProcessed
						// JSON.stringify on Error results in an empty object. Since Error is common, serialize it
						// when a custom JSON handler is not provided
						if (handleError && e instanceof Error) {
							const error = serializeError<unknown>(await errorProcessedReady)
							if (!serverOptions.showErrorStack) {
								delete error.stack
							}
							return { ...rpcBase, error }
						}
						return { ...rpcBase, error: await errorProcessedReady }
					}
				})
				const answeredCalls = checkRpcResult(await Promise.all(answeringCalls))
				return answeredCalls.length === 1 ? answeredCalls[0] : answeredCalls
			} catch (error: unknown) {
				if (typeof error === "object" && error !== null && "primRpc" in error && error.primRpc === PrimRpcSpecific) {
					return error as RpcAnswer | RpcAnswer[]
				}
				return { error: "Unknown RPC error" }
			}
		},
		prepareSend(given) {
			let blobs: BlobRecords = {}
			const givenOnly = (separationNeeded => {
				if (separationNeeded) {
					const givenSeparated = Array.isArray(given) ? given.map(g => extractBlobData(g)) : [extractBlobData(given)]
					const givenOnly = givenSeparated.map(([given, newBlobs]) => {
						blobs = { ...blobs, ...newBlobs }
						return given
					})
					return givenOnly
				} else {
					return [given]
				}
			})(binaryHandlingNeeded)
			const body = jsonHandler.stringify(Array.isArray(given) ? givenOnly : givenOnly[0]) as string
			// NOTE: body length is generally handled by server framework, I think
			const blobCount = Object.keys(blobs).length
			// these mime types are just base suggestions to be overridden by chosen plugin, if applicable
			const singleFileResult =
				blobCount === 1 && !Array.isArray(given) && typeof given.result === "string" && given.result.startsWith("_bin_")
			let contentType = singleFileResult
				? "application/octet-stream"
				: blobCount > 1
					? "multipart/form-data"
					: jsonHandler.mediaType ?? "application/json"
			contentType = jsonHandler?.binary ? "application/octet-stream" : contentType
			const headers = { "content-type": contentType }
			const answers = Array.isArray(given) ? given : [given]
			const statuses = answers.map(answer => ("error" in answer ? 500 : "result" in answer ? 200 : 400))
			const notOkay = statuses.filter(stat => stat !== 200)
			const errored = statuses.filter(stat => stat === 500)
			// NOTE: return 200:okay, 400:missing, 500:error if any call has that status
			const status = notOkay.length > 0 ? (errored.length > 0 ? 500 : 400) : 200
			try {
				return checkHttpLikeResponse({ body, headers, status, blobs }, jsonHandler?.binary)
			} catch (error: unknown) {
				if (typeof error === "object" && error !== null && "primRpc" in error && error.primRpc === PrimRpcSpecific) {
					return { body: jsonHandler.stringify(error) as string, headers: {}, status: 500 }
				}
				const fallbackError = { error: "Unknown RPC error during send" }
				return { body: jsonHandler.stringify(fallbackError) as string, headers: {}, status: 500 }
			}
		},
	}
}

function createServerEvents(serverOptions: PrimServerOptions): PrimServerEvents {
	// TODO: handle error from createServerActions
	const server = () => {
		const { prepareCall, prepareRpc, prepareSend } = createServerActions(serverOptions)
		const call = async (
			given: CommonServerSimpleGivenOptions,
			context?: unknown
		): Promise<CommonServerResponseOptions> => {
			const preparedArgs = prepareCall(given)
			let httpMethod: string | null // don't use `false` as a default value, used by `checkDirectFunctionRpcProperty()`
			try {
				const { method } = checkHttpLikeRequest(given, serverOptions.jsonHandler?.binary)
				httpMethod = method
			} catch (error) {
				httpMethod = null
			}
			const result = await prepareRpc(preparedArgs, context, httpMethod)
			const preparedResult = prepareSend(result)
			return preparedResult
		}
		return { call, prepareCall, prepareRpc, prepareSend }
	}
	return { server, options: serverOptions }
}

function createSocketEvents(serverOptions: PrimServerOptions): PrimServerSocketEvents {
	// TODO: handle error from createServerActions
	const connected = () => {
		const instance = createPrimInstance(serverOptions)
		const { socketEvent: event } = instance
		const { prepareCall, prepareRpc: prepareRpcBase, prepareSend } = createServerActions(serverOptions, instance)
		event.emit("connected")
		const ended = () => {
			event.emit("ended")
			event.all.clear()
		}
		const call = async (body: string, send: PrimServerSocketAnswer, context?: unknown) => {
			// clear previous responses
			// FIXME: don't stop listening to other responses when new call is made)
			event.off("response")
			event.on("response", data => {
				// FIXME: in the future, binary data should also become supported in callback handlers (also, no type cast will be needed)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const { body } = prepareSend(data)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				send(body)
			})
			const preparedArgs = prepareCall({ body })
			const result = await prepareRpcBase(preparedArgs, context, false)
			const preparedResult = prepareSend(result)
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			send(preparedResult.body)
		}
		const rpc = async (body: RpcCall | RpcCall[], send: PrimServerSocketAnswerRpc, context?: unknown) => {
			// clear previous responses
			// FIXME: don't stop listening to other responses when new call is made)
			event.off("response")
			event.on("response", data => {
				send(data)
			})
			const result = await prepareRpcBase(body, context, false)
			send(result)
		}
		// TODO: return `prepare...()` functions below, in event that something more than `call()` is needed
		// for example, in the Prim Server plugin for Web Workers (where `body` is not given).
		// Alternatively, I could create a function `rpc(body: RpcCall, cb: (result: RpcAnswer) => void)` that skips
		// processing of server-given options and response (however, `rpc()` and `call()` should not be called at same time)
		return { ended, call, rpc }
	}
	return { connected, options: serverOptions }
}

// NOTE: these functions may be moved and should be used for transforming input before/after
// calling example function: `hello()`. So, a function named `beforeHello()` would be called
// with parameters matching `beforeCall()` and `afterHello()` would be called with parameters
// matching `afterCall()`
// beforeCall: <Args = unknown[]>(args: Args, ctx: Context) => Args
// afterCall: <Return = unknown>(returned: Return, ctx: Context) => Return
/**
 * Unlike `createPrimClient()`, this function is designed purely for the server. Rather than integrating directly with a
 * server framework, it is meant to be given an RPC call (either over JSON or GET params) and return the result as an
 * RPC answer. This is not a server in itself but instead integrates with your own HTTP/WebSocket frameworks with the
 * possibility to use other protocols if needed.
 *
 * @param options Options for utilizing functions provided with Prim
 * @returns A function that expects JSON resembling an RPC call
 */
export function createPrimServer<
	ModuleType extends OptionsType["module"] = object,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	Context extends ReturnType<OptionsType["context"]> = never,
	OptionsType extends PrimServerOptions = PrimServerOptions<Partial<ModuleType>, JsonHandler>,
>(options?: OptionsType): PrimServer {
	// NOTE: server options may include client options but only server options should be used
	// client options should be re-instantiated on every request
	// TODO: instead of merging options, considering adding client options to server options as separate property
	// and creating client options separately from server
	const serverOptions = Object.freeze({ ...createPrimOptions(options, true) })
	// TODO: consider emitting some kind of event once handlers are configured (for all that have resolved promises)
	// this could be useful for plugins of a server framework where plugins must be given and resolved in order
	const handlersRegistered = Promise.allSettled([
		serverOptions.callbackHandler?.(createSocketEvents(serverOptions)),
		serverOptions.methodHandler?.(createServerEvents(serverOptions)),
	]).then(p => p.map(r => r.status === "fulfilled").reduce((p, n) => p && n, true))
	// NOTE: return actions so a new client is used every time
	const { connected } = createSocketEvents(serverOptions)
	return {
		connected,
		...createServerEvents(serverOptions),
		options: serverOptions,
		handlersRegistered,
	}
}

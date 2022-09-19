import { get as getProperty } from "lodash-es"
import mitt from "mitt"
import queryString from "query-string"
import { createPrimClient, AnyFunction, BLOB_PREFIX } from "./client"
import { createPrimOptions } from "./options"
import {
	CommonServerSimpleGivenOptions, CommonServerResponseOptions, PrimServerOptions, PrimWebSocketEvents,
	RpcAnswer, RpcCall, PrimServerSocketAnswer, PrimServerSocketEvents, PrimServerActionsBase, PrimHttpEvents,
	PrimServerEvents,
	PrimServer,
	PrimServerSocketAnswerRpc,
} from "./interfaces"
import { serializeError } from "serialize-error"

/**
 * 
 * @param options Options for Prim server, including client options
 * @returns A `client` used for RPC calls, `configured` settings for Prim Server,
 * and event handlers for generic events used when making WS/HTTP calls
 */
function createPrimInstance (options?: PrimServerOptions) {
	const configured = createPrimOptions(options)
	const socketEvent = mitt<PrimWebSocketEvents>()
	const clientEvent = mitt<PrimHttpEvents>()
	configured.internal = { socketEvent, clientEvent }
	const client = createPrimClient(configured)
	return { client, socketEvent, clientEvent, configured }
}

function createServerActions (serverOptions: PrimServerOptions, instance?: ReturnType<typeof createPrimInstance>): PrimServerActionsBase {
	const { jsonHandler, prefix: serverPrefix, handleError } = serverOptions
	const prepareCall = (given: CommonServerSimpleGivenOptions = {}): RpcCall|RpcCall[] => {
		const { body = "", method = "POST", url: possibleUrl = "" } = given
		const providedBody = body && method === "POST"
		if (providedBody) {
			const prepared = jsonHandler.parse<RpcCall|RpcCall[]>(given.body)
			return prepared
		}
		const providedUrl = possibleUrl !== "" && method === "GET"
		if (providedUrl) {
			const positional = []
			const { query, url } = queryString.parseUrl(possibleUrl, {
				arrayFormat: "comma",
				parseBooleans: true,
				parseNumbers: true,
			})
			const id = "-" in query ? String(query["-"]) : undefined
			delete query["-"]
			const entries = Object.entries(query)
			// determine if positional arguments were given (must start at 0, none can be missing)
			for (const [possibleIndex, value] of entries) {
				const index = Number.parseInt(possibleIndex)
				if (Number.isNaN(index)) { break }
				const nextIndex = index === 0 || typeof positional[index - 1] !== "undefined"
				if (!nextIndex) { break }
				positional[index] = value
			}
			const params = (positional.length > 0 && positional.length === entries.length) ? positional : query
			let method = url.replace(RegExp("^" + serverPrefix + "\\/?"), "")
			method = method !== "" ? method : "default"
			return { id, method, params }
		}
		// NOTE: consider failing instead of falling back to default export
		return { method: "default" }
	}
	const prepareRpc = async (
		calls: RpcCall|RpcCall[],
		blobs: Record<string, unknown> = {},
		cbResults?: (a: RpcAnswer) => void,
	): Promise<RpcAnswer|RpcAnswer[]> => {
		// NOTE: new Prim client should be created on each request so callback results are not shared
		const { client, socketEvent: event } = instance ?? createPrimInstance(serverOptions)
		const callList = Array.isArray(calls) ? calls : [calls]
		const answeringCalls = callList.map(async (given): Promise<RpcAnswer> => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const { method, params, id } = given
			try {
				const methodExpanded = method.split("/")
				const target = getProperty(client, methodExpanded) as AnyFunction
				let args = Array.isArray(params) ? params : [params]
				if (Object.entries(blobs).length > 0) {
					args = args.map(arg => {
						if (typeof arg === "string" && arg.startsWith(BLOB_PREFIX)) {
							return blobs[arg] ?? arg
						}
						if (typeof arg === "object") {
							for (const [key, val] of Object.entries(arg as unknown)) {
								if (typeof val === "string" && val.startsWith(BLOB_PREFIX)) {
									// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
									arg[key] = blobs[val] ?? val
								}
							}
							return arg as unknown
						}
						if (Array.isArray(arg)) {
							return arg.map(given => {
								if (typeof given === "string" && given.startsWith(BLOB_PREFIX)) {
									return blobs[given] ?? given
								}
								return given as unknown
							})
						}
						return arg as unknown
					})
				}
				if (cbResults) { event.on("response", cbResults) }
				// TODO: if `methodExpanded.at(-2)` is a function, call that instead of `methodExpanded.at(-1)`
				// this is to prevent someone from calling function properties like `call`, `apply`, and `bind`
				// TODO: regarding TODO above, consider only blocking properties listed above and not custom defined properties
				// on function (so a developer could call custom function defined on Function Object, like `myFunction.docs()`)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const result: RpcAnswer = await Reflect.apply(target, undefined, args)
				// TODO: today, result must be supported by JSON handler but consider supporting returned functions
				// in the same way that callback are supported today (by passing reference to client)
				return { result, id }
			} catch (e) {
				// JSON.stringify on Error results in an empty object. Since Error is common, serialize it
				// when a custom JSON handler is not provided
				if (handleError && e instanceof Error) {
					const error = serializeError<unknown>(e)
					return { error, id }
				}
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				return { error: e, id }
			}
		})
		const answeredCalls = await Promise.all(answeringCalls)
		return answeredCalls.length === 1 ? answeredCalls[0] : answeredCalls
	}
	const prepareSend = (given: RpcAnswer|RpcAnswer[]): CommonServerResponseOptions => {
		const body = jsonHandler.stringify(given)
		// NOTE: body length is generally handled by server framework, I think
		const headers = { "Content-Type": "application/json" }
		const answers = Array.isArray(given) ? given : [given]
		const statuses = answers.map(answer => answer.error ? 500 : (answer.result ? 200 : 400))
		const notOkay = statuses.filter(stat => stat !== 200)
		const errored = statuses.filter(stat => stat === 500)
		// NOTE: return 200:okay, 400:missing, 500:error if any call has that status
		const status = notOkay.length > 0 ? (errored.length > 0 ? 500 : 400) : 200
		return { body, headers, status }
	}
	return { prepareCall, prepareRpc, prepareSend }
}

function createServerEvents (serverOptions: PrimServerOptions): PrimServerEvents {
	const server = () => {
		const { prepareCall, prepareRpc, prepareSend } = createServerActions(serverOptions)
		const call = async (
			given: CommonServerSimpleGivenOptions,
			blobs: Record<string, unknown> = {},
		): Promise<CommonServerResponseOptions> => {
			const preparedParams = prepareCall(given)
			const result = await prepareRpc(preparedParams, blobs)
			const preparedResult = prepareSend(result)
			return preparedResult
		}
		return { call, prepareCall, prepareRpc, prepareSend }
	}
	return { server, options: serverOptions }
}

function createSocketEvents (serverOptions: PrimServerOptions): PrimServerSocketEvents {
	const connected = () => {
		const instance = createPrimInstance(serverOptions)
		const { socketEvent: event } = instance
		const { prepareCall, prepareRpc: prepareRpcBase, prepareSend } = createServerActions(serverOptions, instance)
		event.emit("connected")
		const ended = () => {
			event.emit("ended")
			event.all.clear()
		}
		const call = async (body: string, send: PrimServerSocketAnswer) => {
			// clear previous responses (FIXME: don't stop listening to other responses when new call is made)
			event.off("response")
			event.on("response", (data) => {
				const { body } = prepareSend(data)
				send(body)
			})
			const preparedParams = prepareCall({ body })
			const result = await prepareRpcBase(preparedParams)
			const preparedResult = prepareSend(result)
			send(preparedResult.body)			
		}
		const rpc = async (body: RpcCall|RpcCall[], send: PrimServerSocketAnswerRpc) => {
			// clear previous responses (FIXME: don't stop listening to other responses when new call is made)
			event.off("response")
			event.on("response", (data) => {
				send(data)
			})
			const result = await prepareRpcBase(body)
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
// beforeCall: <Params = unknown[]>(params: Params, ctx: Context) => Params
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPrimServer<
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	ModuleType extends OptionsType["module"] = object,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	Context extends ReturnType<OptionsType["context"]> = never, 
	OptionsType extends PrimServerOptions = PrimServerOptions,
>(options?: PrimServerOptions): PrimServer {
	// NOTE: server options may include client options but only server options should be used
	// client options should be re-instantiated on every request
	// TODO: instead of merging options, considering adding client options to server options as separate property
	// and creating client options separately from server
	const serverOptions = createPrimOptions(options, true)
	// TODO: consider emitting some kind of event once handlers are configured (for all that have resolved promises)
	// this could be useful for plugins of a server framework where plugins must be given and resolved in order
	const handlersRegistered = Promise.allSettled([
		serverOptions.callbackHandler?.(createSocketEvents(serverOptions)),
		serverOptions.methodHandler?.(createServerEvents(serverOptions)),
	]).then(p => p.map(r => r.status === "fulfilled").reduce((p, n) => p && n, true))
	// NOTE: return actions so a new client is used every time
	return {
		...createServerEvents(serverOptions),
		options: Object.freeze(Object.assign({}, serverOptions)),
		handlersRegistered,
	}
}

// IDEA: Prim should accept HTTP handler to automatically register server framework plugins
// as an option of Prim, but also, server framework plugins should be provided directly
// so that if someone wishes to register themselves (like with connect middleware) then they can.
// Since the HTTP handler is just registering plugins, it makes sense to also provide that
// server framework's plugin directly.
// This however can't be done with WebSockets since they're not usually pluggable like
// server frameworks are in Node.js (like Connect middleware or Fastify plugins)

// const server = createPrimServer({
// 	methodHandler({ client }) {
// 		// this is an example of express middleware
// 		app.use("/prim", async (req, res) => {
// 			const { call } = client()
// 			const { body, headers, status } = await call({
// 				body: req.body,
// 				method: req.method,
// 				url: req.url
// 			})
// 			res.set(headers)
// 			res.status(status)
// 			res.send(body)
// 		})
// 	},
// 	callbackHandler({ connected }) {
// 		wss.on("connected", () => {
// 			const { ended, call } = connected()
// 			ws.on("ended", () => ended())
// 			ws.on("message", (m) => {
// 				call(m, (data) => {
// 					ws.send(data)
// 				})
// 			})
// 		})
// 	},
// 	context: () => "",
// })

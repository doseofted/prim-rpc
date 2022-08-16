import { get as getProperty } from "lodash-es"
import mitt from "mitt"
import { AnyFunction, createPrimClient } from "./client"
import { CommonServerSimpleGivenOptions, CommonServerResponseOptions, PrimServerOptions, PrimWebSocketEvents, RpcAnswer, RpcCall, PrimServerSocketAnswer, PrimServerSocketEvents, PrimServerActions, PrimHttpEvents, PrimServerEvents } from "./interfaces"
import { createPrimOptions } from "./options"

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
	Context extends ReturnType<OptionsType["context"]> = never, 
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	ModuleType extends OptionsType["module"] = object,
	OptionsType extends PrimServerOptions = PrimServerOptions,
>(options?: PrimServerOptions) {
	// NOTE: server options may include client options but only server options should be used
	// client options should be re-instantiated on every request
	// TODO: instead of merging options, considering adding client options to server options as separate property
	// and creating client options separately from server
	const serverOptions = createPrimOptions(options)
	serverOptions.callbackHandler(createSocketEvents())
	serverOptions.methodHandler(createServerEvents())

	function createPrimInstance () {
		const configured = createPrimOptions(options)
		const socketEvent = mitt<PrimWebSocketEvents>()
		const clientEvent = mitt<PrimHttpEvents>()
		configured.internal = { socketEvent, clientEvent }
		const client = createPrimClient(configured)
		return { client, socketEvent, clientEvent, configured }
	}

	function createServerActions (instance?: ReturnType<typeof createPrimInstance>): PrimServerActions {
		const prepareCall = (_given: CommonServerSimpleGivenOptions): RpcCall => {
			return { method: "", id: "", params: [] }
		}
		const rpc = async (given: RpcCall): Promise<RpcAnswer> => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const { method, params, id } = given
			try {
				// NOTE: new Prim client should be created on each request so callback results are not shared
				const prim = instance ?? createPrimInstance()
				const methodExpanded = method.split("/")
				const target = getProperty(prim, methodExpanded) as AnyFunction
				const args = Array.isArray(params) ? params : [params]
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				return { result: await Reflect.apply(target, undefined, args), id }
			} catch (error) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				return { error, id }
			}
		}
		const prepareSend = (_given: RpcAnswer): CommonServerResponseOptions => {
			return { body: "", headers: {}, status: 200 }
		}
		return { prepareCall, rpc, prepareSend }
	}

	function createServerEvents (): PrimServerEvents {
		const client = () => {
			const { prepareCall, rpc, prepareSend } = createServerActions()
			/**
			 * This function prepares a useable result for common server frameworks
			 * using common options that most servers provide. It is a shortcut for
			 * other processing steps for Prim-RPC.
			 * 
			 * This calls, in order, `.prepareCall()`, `.rpc()`, and `.prepapreSend()`
			 */
			const call = async (given: CommonServerSimpleGivenOptions): Promise<CommonServerResponseOptions> => {
				const preparedParams = prepareCall(given)
				const result = await rpc(preparedParams)
				const preparedResult = prepareSend(result)
				return preparedResult
			}
			return { call, prepareCall, rpc, prepareSend }
		}
		return { client }
	}

	function createSocketEvents (): PrimServerSocketEvents {
		const connected = () => {
			const instance = createPrimInstance()
			const { socketEvent: event } = instance
			const { prepareCall, rpc: rpcCall, prepareSend } = createServerActions(instance)
			event.emit("connected")
			const ended = () => {
				event.emit("ended")
				event.all.clear()
			}
			const call = async (body: string, send: PrimServerSocketAnswer) => {
				// TODO: find out if I'm attaching too many event listeners here
				event.on("response", (data) => {
					const { body } = prepareSend(data)
					send(body)
				})
				const preparedParams = prepareCall({ body })
				const result = await rpcCall(preparedParams)
				const preparedResult = prepareSend(result)
				send(preparedResult.body)			
			}
			return { ended, call }
		}
		return { connected }
	}

	return (rpc: RpcCall) => {
		const { rpc: rpcCall } = createServerActions()
		return rpcCall(rpc)
	}
}

// IDEA: Prim should accept HTTP handler to automatically register server framework plugins
// as an option of Prim, but also, server framework plugins should be provided directly
// so that if someone wishes to register themselves (like with connect middleware) then they can.
// Since the HTTP handler is just registering plugins, it makes sense to also provide that
// server framework's plugin directly.
// This however can't be done with WebSockets since they're not usually pluggable like
// server frameworks are in Node.js (like Connect middleware or Fastify plugins)

// createPrimServer({
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
import { get as getProperty } from "lodash-es"
import mitt from "mitt"
import { AnyFunction, createPrimClient } from "./client"
import { CommonServerGivenOptions, CommonServerResponseOptions, PrimServerOptions, PrimWebSocketEvents, RpcAnswer, RpcCall } from "./interfaces"
import { createPrimOptions } from "./options"

export interface PrimServer {
	/**
	 * Step 1: Passing common parameters used by server frameworks to Prim, gather the
	 * prepared RPC call from the request. See `.rpc()` for next step.
	 */
	prepareCall: (given: CommonServerGivenOptions) => RpcCall
	/**
	 * Step 2: Using the result of `.prepareCall()`, use the RPC to get a result from Prim.
	 * See `.prepareSend()` for next step.
	 */
	rpc: (given: RpcCall) => Promise<RpcAnswer>
	/**
	 * Step 3: Using the result of `.rpc()`, prepare the result to be sent with the server framework.
	 * See `.handleCallback()` for optional next step.
	 */
	prepareSend: (given: RpcAnswer) => CommonServerResponseOptions
	/**
	 * Handle callbacks on any function called for Prim server. This function should be executed
	 * on new connections ...maybe.
	 * 
	 * TODO: figure out best to handle websockets, both in terms of callbacks and handling
	 * RPC calls over websocket, if not already handled
	 */
	handleCallback: () => void
}

/**
 * Unlike `createPrimClient()`, this function is designed purely for the server. Rather than integrating directly with a
 * server framework, it is meant to be given a JSON body expected for the RPC call and return the result as an RPC
 * answer. The integration with a server framework is just a wrapper around this function that prepares the RPC calls
 * and then does any processing needed (if any) before returning the result back.
 * 
 * @param options Options for utilizing functions provided with Prim
 * @param givenModule If `options.server` is true, provide the module where functions should be resolved
 * @returns A function that expects JSON resembling an RPC call
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPrimServer<
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	ModuleType extends OptionsType["module"] = object,
	OptionsType extends PrimServerOptions = PrimServerOptions,
>(options?: PrimServerOptions): PrimServer {
	const configured = createPrimOptions(options)
	const socketEvent = mitt<PrimWebSocketEvents>()
	configured.internal = { socketEvent }
	return {
		prepareCall(given) {
			// ...
			// TODO: add valid handling of URL parameters if method is POST, like the following as examples:
			// Object argument: /prim?sayHello?greeting=Hey&name=Ted
			// Positional args: /prim?sayHelloAlternative?0=Hey&1=Ted
			// NOTE: nested queries should either be added later with a lot of consideration or ignored
			// since this makes queries too complicated to read (at this point, just POST it)
			// If not a GET and instead a POST request, parse the body of the request
		},
		async rpc(given) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const { method, params, id } = given
			try {
				// NOTE: new Prim client should be created on each request so callback results are not shared
				const prim = createPrimClient(configured)
				const methodExpanded = method.split("/")
				const target = getProperty(prim, methodExpanded) as AnyFunction
				const args = Array.isArray(params) ? params : [params]
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				return { result: await Reflect.apply(target, undefined, args), id }
			} catch (error) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				return { error, id }
			}
		},
		prepareSend(given) {
			// ...
			// TODO: make sure JSON header is added and return is either 200 (resolved),
			// 400 (maybe, represents: method doesn't exist), or 500 (rejected)
		},
	}
}
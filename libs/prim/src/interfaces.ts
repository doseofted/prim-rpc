import type { Emitter } from "mitt"

// SECTION RPC call and result structure
interface RpcBase { id?: string|number }

export interface RpcCall<Method = string, Params = unknown> extends RpcBase {
	method: Method
	params?: Params
}

export interface RpcAnswer<Result = unknown, Error = unknown> extends RpcBase {
	result?: Result
	error?: Error
}
// !SECTION

// SECTION HTTP/WebSocket events
export enum PromiseResolveStatus {
	/** Promise has not been created yet */ Unhandled,
	/** Promise has been created but not yet resolved */ Pending,
	/** Promise has resolved */ Resolved,
}

export interface PrimHttpQueueItem {
	rpc: RpcCall
	result: Promise<RpcAnswer>,
	resolved: PromiseResolveStatus
}

export type PrimHttpEvents = {
	response: RpcAnswer
	queue: PrimHttpQueueItem
}

export type PrimWebSocketEvents = {
	connected: undefined
	response: RpcAnswer
	ended: undefined
}

// NOTE: all functions' params must match type of same name given above
interface PrimWebSocketFunctionEvents {
	connected: () => void
	// NOTE: I don't need to return multiple answers unless batching is allowed over websocket (not needed)
	// response: (answer: RpcAnswer|RpcAnswer[]) => void
	response: (answer: PrimWebSocketEvents["response"]) => void
	ended: () => void
}
// !SECTION

// SECTION Client options
export interface JsonHandler {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	stringify: (json: unknown) => string
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	parse: <T = any>(string: string) => T
}
// type JsonHandlerOptional  = Partial<JsonHandler>

export type PrimClientFunction<J = JsonHandler> = (endpoint: string, jsonBody: RpcCall|RpcCall[], jsonHandler: J) => Promise<RpcAnswer|RpcAnswer[]>
export type PrimSocketFunction<J = JsonHandler> = (endpoint: string, events: PrimWebSocketFunctionEvents, jsonHandler: J) => ({
	send: (message: RpcCall|RpcCall[]) => void
})

type OptionsPresetFallback = "development"|"production"

export interface PrimOptions<M extends object = object, J extends JsonHandler = JsonHandler> {
	/**
	 * This option is not yet implemented.
	 *
	 * Choose a preset to fallback on if any options are not provided. By default, no preset is used.
	 */
	preset?: OptionsPresetFallback
	/**
	 * Module to use with Prim. When a function call is made, given module will be used first, otherwise an RPC will
	 * be made.
	 */
	module?: M
	/**
	 * Provide the server URL where Prim is being used. This will be provided to the HTTP client as the endpoint
	 * parameter.
	 */
	endpoint?: string
	/**
	 * Provide the server URL where Prim is being used. This will be provided to the WS client as the endpoint parameter.
	 * If not provided, the HTTP `endpoint` option will be attempted with the WebSocket protocol.
	 */
	wsEndpoint?: string
	/**
	 * If zero, don't batch RPC calls. If non-zero then wait a short time, in milliseconds, before sending HTTP requests.
	 * This comes in handy when sending multiple RPC calls at once that do not depend on one another.
	 * 
	 * As a recommendation, keep this time very low (under `15`ms). Default is `0` (don't batch).
	 */
	clientBatchTime?: number
	/**
	 * Usually the default of `JSON` is sufficient but parsing/conversion of more complex types may benefit from other
	 * JSON handling libraries. The same handler must be used on both the server and client.
	 *
	 * Given module is required to have both a `.stringify(obj)` and `.parse(str)` method. If chosen JSON handler requires
	 * additional options, it is recommended to create the stringify/parse functions and wrap the intended JSON handler
	 * in these functions.
	 */
	jsonHandler?: J
	/**
	 * You may override the HTTP framework used for RPC requests (the default is the Fetch API).
	 * A custom client should:
	 * 
	 *    1. Stringify given RPC with chosen JSON handler
	 *    2. Send off request to the server
	 *    3. Parse given response with chosen JSON handler
	 *    4. Resolve on success and reject on error
	 * 
	 * You may also choose to use another protocol altogether as long as it can become compatible with the interface
	 * that Prim-RPC expects (for instance: inter-process communication).
	 *
	 * @param endpoint The configured `endpoint` on created instance
	 * @param jsonBody RPC to be stringified before being sent to server
	 * @param jsonHandler Provided handler for JSON, with `.stringify()` and `.parse()` methods
	 */
	client?: PrimClientFunction<J>
	/**
	 * You may override the WS framework used for handling callbacks on RPC requests (the default is the WebSocket API).
	 * A custom client should:
	 *
	 *    1. Open a new websocket
	 *    2. Call `events.connected()` and `events.ended()` when websocket is opened and closed
	 *    3. Parse messages received using given JSON handler and call `events.response()` with the result
	 *    4. Create a function that sends messages over WebSocket. Return this as a method on an object named `.send()`
	 * 
	 * You may also choose to use another protocol altogether as long as it can become compatible with the interface
	 * that Prim-RPC expects (for instance: HTTP long-polling).
	 *
	 * @param endpoint The configured `wsEndpoint` on created instance
	 * @param events: An object containing several callbacks that should be called when event happens on websocket
	 * @param jsonHandler Provided handler for JSON, with `.stringify()` and `.parse()` methods
	 */
	socket?: PrimSocketFunction<J>
	/**
	 * Whether Errors should be serialized before sending from the server and deserialized when received on the client.
	 * The default is `true` unless a custom JSON handler is set. You may set this option explicitly to always use your
	 * preference. When set to `false`, thrown errors are returned to client as an empty object unless your JSON handler
	 * can stringify `Error` objects.
	 * 
	 * This option must be set to the same value on the server and client.
	 */
	handleError?: boolean
	// TODO: Prim Server should create these options and hold references. This will be removed.
	/** Properties belonging to `internal` are for internal use by Prim-RPC. */
	internal?: {
		/** Event emitter for callbacks to be shared with Prim Server (typically WebSocket-related) */
		socketEvent?: Emitter<PrimWebSocketEvents>
		// TODO: determine if this is useful (overriding client as option of Prim client may be enough)
		/** Event emitter for RPC to be shared with Prim Server */
		clientEvent?: Emitter<PrimHttpEvents>
	}
}
// !SECTION

// SECTION Server calls
/**
 * Common options for servers that are just lightweight extensions of "node:http".
 * 
 * For GET requests, `.url` and `.method` will be used.
 * For POST requests, `.body` will be used.
 */
export interface CommonServerSimpleGivenOptions {
	/** Generally the the full URL, including protocol, host, path, and query */
	url?: string
	/** HTTP method */
	method?: string
	/** The body of the request as a string */
	body?: string
}

export interface CommonServerResponseOptions {
	/** HTTP status code */
	status: number
	/** Headers, as generally formatted for most Node servers */
	headers: { [header: string]: string }
	/** Body of result, as a string */
	body: string
}
// !SECTION

// SECTION Server options
export type PrimServerMethodHandler<T extends object = object> = (actions: PrimServerEvents, options?: T) => void
export type PrimServerCallbackHandler<T = unknown> = (events: PrimServerSocketEvents, options?: T) => void

export interface PrimServerOptions<C = unknown> extends PrimOptions {
	/**
	 * The path prefix as used on the request. When processing GET requests to Prim-RPC, the prefix will
	 * be removed from the function name.
	 */
	prefix?: string
	/**
	 * Configure your HTTP server to automatically send results from given RPC calls.
	 */
	methodHandler?: PrimServerMethodHandler
	/**
	 * Configure your own WebSocket server to automatically receive and send messages
	 * that Prim-RPC expects.
	 */
	callbackHandler?: PrimServerCallbackHandler
	/**
	 * Context of server being used, passed from a function called by the server framework
	 * which returns the parameters to be used. This type is the return type of that function.
	 */
	context?: () => C
	/**
	 * Options intended to be used from Prim's client
	 * TODO: consider splitting client options to this property
	 */
	// clientOptions?: PrimOptions
}

export type PrimServerSocketAnswer = (result: string) => void
interface PrimServerConnectedActions {
	ended: () => void
	call: (data: string, send: PrimServerSocketAnswer) => void
}
export interface PrimServerSocketEvents {
	connected: () => PrimServerConnectedActions
}

export interface PrimServerActionsBase {
	/**
	 * Step 1: Passing common parameters used by server frameworks to Prim, gather the
	 * prepared RPC call from the request. See `.rpc()` for next step.
	 */
	prepareCall: (given: CommonServerSimpleGivenOptions) => RpcCall|RpcCall[]
	/**
	 * Step 2: Using the result of `.prepareCall()`, use the RPC to get a result from Prim.
	 * See `.prepareSend()` for next step.
	 */
	prepareRpc: (given: RpcCall|RpcCall[]) => Promise<RpcAnswer|RpcAnswer[]>
	/**
	 * Step 3: Using the result of `.rpc()`, prepare the result to be sent with the server framework.
	 * See `.handleCallback()` for optional next step.
	 */
	prepareSend: (given: RpcAnswer|RpcAnswer[]) => CommonServerResponseOptions
}

export interface PrimServerActionsExtended extends PrimServerActionsBase {
	/**
	 * This function prepares a useable result for common server frameworks
	 * using common options that most servers provide. It is a shortcut for
	 * other processing steps of Prim-RPC.
	 * 
	 * This calls, in order, `.prepareCall()`, `.rpc()`, and `.prepareSend()`
	 */
	call: (given: CommonServerSimpleGivenOptions) => Promise<CommonServerResponseOptions>
}

export interface PrimServerEvents {
	client: () => PrimServerActionsExtended
	options: PrimServerOptions
}

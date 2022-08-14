import { Emitter } from "mitt"
import { RpcErr } from "./error"
interface RpcBase {
	id?: string | number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface RpcCall<Method = string, Params = any> extends RpcBase {
	method: Method
	params?: Params
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface RpcAnswer<Result = any, Error = any> extends RpcBase {
	result?: Result
	error?: RpcErr<Error>
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

// NOTE: this must match type given above
export interface PrimWebSocketFunctionEvents {
	connected: () => void
	// NOTE: I don't need to return multiple answers unless batching is allowed over websocket (not needed)
	// response: (answer: RpcAnswer|RpcAnswer[]) => void
	response: (answer: RpcAnswer) => void
	ended: () => void
}
export enum PromiseResolveStatus {
	/** Promise has not been created yet */
	UNHANDLED,
	/** Promise has been created but not yet resolved */
	PENDING,
	/** Promise has resolved */
	YES,
}
export interface QueuedHttpCall {
	rpc: RpcCall
	result: Promise<RpcAnswer>
	resolved?: PromiseResolveStatus
}

export interface JsonHandler {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	stringify: (json: unknown) => string
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	parse: <T = any>(string: string) => T
}
// type JsonHandlerOptional  = Partial<JsonHandler>

export type PrimClientFunction = (endpoint: string, jsonBody: RpcCall|RpcCall[], jsonHandler: JsonHandler) => Promise<RpcAnswer|RpcAnswer[]>
export type PrimSocketFunction = (endpoint: string, events: PrimWebSocketFunctionEvents, jsonHandler: JsonHandler) => ({
	send: (message: RpcCall|RpcCall[]) => void
})

export interface PrimOptions<M extends object = object, J extends JsonHandler = JSON> {
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
	 * JSON handling libraries.
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
	client?: PrimClientFunction
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
	socket?: PrimSocketFunction
	/** Properties belonging to `internal` are for internal use by Prim-RPC. */
	internal?: {
		/** Event emitter to be shared with Prim Server, if websocket events are used */
		event?: Emitter<PrimWebSocketEvents>
	}
}

/**
 * Common properties given by server frameworks so generic `createPrimServer`
 * can translate generic request into RPC.
 */
export interface CommonFrameworkOptions {
	/** The prefix where Prim lives, to be removed from the path. By default: `/prim` */
	prefix?: string
	/** The URL before parsing querystring */
	url?: string
	/** The JSON body, which should already be formatted as RPC */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	body?: any
}

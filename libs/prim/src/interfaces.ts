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
	resolved?: "yes"|"pending"
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

export interface JsonHandler {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	stringify?: (json: unknown) => string
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	parse?: <T = any>(string: string) => T
}

export type PrimClientFunction = (endpoint: string, jsonBody: RpcCall|RpcCall[], jsonHandler?: JsonHandler) => Promise<RpcAnswer|RpcAnswer[]>
export type PrimSocketFunction = (endpoint: string, events: PrimWebSocketFunctionEvents, jsonHandler?: JsonHandler) => ({
	send: (message: RpcCall|RpcCall[]) => void
})

export interface PrimOptions {
	/** `true` when Prim-RPC is used from server. A module to be resolved should also be given as argument to `createPrim` */
	server?: boolean
	/** When `options.server` is `false`, provide the server URL where Prim is being used, to be used from `options.client` */
	endpoint?: string
	/** When `options.server` is `false` and websocket endpoint is different from HTTP endpoint, provide the websocket URL where Prim is being used, to be used from `options.socket` */
	wsEndpoint?: string
	/**
	 * If zero, don't batch RPC calls. If non-zero then wait a short time, in milliseconds, before sending HTTP requests.
	 * This comes in handy when sending multiple RPC calls at once that do not depend on one another.
	 * 
	 * As a recommendation, keep this time very low (under `15`ms). Default is `0` (don't batch).
	 */
	clientBatchTime?: number
	/**
	 * Usually default of `JSON` is sufficient but parsing/conversion of more complex types may benefit from other JSON handling libraries.
	 *
	 * Given object is required to have both a `.stringify()` and `.parse()` method.
	 */
	jsonHandler?: JsonHandler
	/**
	 * When used from the client, override the HTTP framework used for requests (default is browser's `fetch()`)
	 * @param endpoint The configured `option.endpoint` on created instance
	 * @param jsonBody RPC to be stringified before being sent to server
	 * @param jsonHandler Provide a custom handler for JSON, with `.stringify()` and `.parse()` methods
	 */
	client?: PrimClientFunction
	/**
	 * Use a given WebSocket framework and utilize generic websocket events given over function.
	 *
	 * @param endpoint The configured `option.endpoint` on created instance
	 * @param events: An object containing several callbacks that should be called when event happens on websocket
	 * @param jsonHandler Provide a custom handler for JSON, with `.stringify()` and `.parse()` methods
	 */
	socket?: PrimSocketFunction
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

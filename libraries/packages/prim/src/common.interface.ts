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

export interface PrimOptions {
	/** `true` when Prim-RPC is used from server. A module to be resolved should also be given as argument to `createPrim` */
	server?: boolean
	/** When `options.server` is `false`, provide the server URL where Prim is being used, to be used from `options.client` */
	endpoint?: string
	/** When `options.server` is `false` and websocket endpont is different from HTTP endpoint, provide the websocket URL where Prim is being used, to be used from `options.socket` */
	wsEndpoint?: string
	/**
	 * When used from the client, override the HTTP framework used for requests (default is browser's `fetch()`)
	 * 
	 * @param {RpcCall} jsonBody RPC to be stringified before being sent to server
	 * @param {string} endpoint The configured `option.endpoint` on created instance
	 */
	client?: (jsonBody: RpcCall, endpoint: string) => Promise<RpcAnswer>
	/** If a custom websocket framework is used,  */
	socket?: {
		create: <T>(endpoint: string) => T,
		send: (jsonBody: RpcCall, endpoint: string) => void
		message: (response: unknown) => Promise<RpcAnswer>
	},
	// NOTE not utilized yet but could be useful for passing internal options to Prim
	internal?: Record<string, unknown>
}

/**
 * Common properties given by server frameworks so generic `createPrimServer`
 * can translate generic request into RPC.
 */
export interface CommonFrameworkOptions {
	/** Typically the path without a querystring */
	path?: string
	/** The prefix where Prim lives. To be removed from the path. */
	prefix?: string
	/** The parsed querystring, usally a JSON object */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	query?: Record<string | number, any>
	/** The JSON body, which should already be formatted as RPC */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	body?: Record<string | number, any>
}
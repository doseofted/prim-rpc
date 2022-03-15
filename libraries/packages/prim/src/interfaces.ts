import { Emitter } from "nanoevents"
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

export interface PrimWebsocketEvents {
	response: (message: RpcAnswer) => void
	end: () => void
	// connect: () => void
}

export interface PrimWebSocketEvents {
	connected: () => void
	response: (answer: RpcAnswer) => void
	ended: () => void
}

export interface PrimOptions {
	/** `true` when Prim-RPC is used from server. A module to be resolved should also be given as argument to `createPrim` */
	server?: boolean
	/** When `options.server` is `false`, provide the server URL where Prim is being used, to be used from `options.client` */
	endpoint?: string
	/** When `options.server` is `false` and websocket endpont is different from HTTP endpoint, provide the websocket URL where Prim is being used, to be used from `options.socket` */
	wsEndpoint?: string
	/**
	 * Usually default of `JSON` is sufficient but parsing/conversion of more complex types may benefit from other JSON handling libraries.
	 *
	 * Given object is required to have both a `.stringify()` and `.parse()` method.
	 */
	jsonHandler?: JSON
	/**
	 * When used from the client, override the HTTP framework used for requests (default is browser's `fetch()`)
	 * 
	 * @param {RpcCall} jsonBody RPC to be stringified before being sent to server
	 * @param {string} endpoint The configured `option.endpoint` on created instance
	 */
	client?: (endpoint: string, jsonBody: RpcCall, jsonHandler?: JSON) => Promise<RpcAnswer>
	/** If a custom websocket framework is used,  */
	socket?: (endpoint: string, events: PrimWebSocketEvents, jsonHandler?: JSON) => ({
		send: (message: RpcCall) => void
	})
	internal?: {
		/** Event emitter to be shared with Prim Server, if websocket events are used */
		event?: Emitter<PrimWebsocketEvents>
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

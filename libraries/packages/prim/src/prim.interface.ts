interface RpcBase {
	id?: string | number
}

export interface RpcErr<Data = unknown> {
	code: number
	message: string
	data?: Data
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
		send: (jsonBody: RpcCall, endpoint: string) => void
		message: (response: unknown) => Promise<RpcAnswer>
	},
	internal?: {
		nested: number
	}
}

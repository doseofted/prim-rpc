interface RpcBase {
	jsonrpc: "2.0"
	id: null | string | number
}

interface RpcError<T = unknown> {
	code: number
	message: string
	data?: T
}

interface RpcCall<T = unknown> extends RpcBase {
	method: string
	params?: T
}

interface RpcAnswer<T = unknown> extends RpcBase {
	result?: T
	error?: RpcError
}
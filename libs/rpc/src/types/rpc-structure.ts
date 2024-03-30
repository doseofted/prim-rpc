export interface RpcBase {
	prim?: 0 // as new major versions are announced (only that change message structure), bump version
	id?: string | number
}

export interface RpcCall<Method = string, Args = unknown[], Chain extends RpcChain[] = RpcChain[]> extends RpcBase {
	method: Method
	args?: Args
	chain?: Chain
}

export interface RpcAnswer<Result = unknown, Error = unknown> extends RpcBase {
	result?: Result
	error?: Error
}

export type RpcChain<Method = string, Args = unknown[]> = Pick<RpcCall<Method, Args>, "method" | "args">

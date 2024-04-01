enum RpcErrorCode {
	InvalidRpcResult = 0,
}

export class RpcError extends Error {
	constructor(
		public code: RpcErrorCode,
		message?: string
	) {
		const defaultMessage = "see Prim+RPC documentation for more information"
		super(`Error ${code}: ${message ?? defaultMessage}`)
	}
}

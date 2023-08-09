enum PrimErr {
	InvalidRpcResult = 0,
}

const errorMessages = {
	[PrimErr.InvalidRpcResult]: "Invalid RPC result",
}

export class PrimRpcError extends Error {
	public primRpc = true

	public constructor(
		public code: PrimErr,
		messageOverride?: string
	) {
		super(messageOverride || errorMessages[code])
	}
}

// const err = new PrimRpcError(PrimErr.InvalidRpcResult)

import type {
	BlobRecords,
	CommonServerResponseOptions,
	CommonServerSimpleGivenOptions,
	RpcAnswer,
	RpcBase,
	RpcCall,
} from "./interfaces"

export const NotGiven = Symbol("unknown")
export const PrimRpcSpecific = Symbol("primRpc")

// SECTION: Validation of RPC calls and results

/**
 * Check that RPC call/result is valid object with/without an ID
 *
 * @param given RPC call or result
 * @returns The base error, base call/rpc, and given object
 * @throws RPC response, an error
 */
function checkRpcBase<T extends RpcBase>(given: unknown) {
	const givenRpc = typeof given === "object" && given !== null && given
	if (!givenRpc) {
		const err = { error: "Invalid RPC" }
		Object.defineProperty(err, "primRpc", { value: PrimRpcSpecific, enumerable: false, writable: false })
		throw err
	}
	const id =
		"id" in givenRpc
			? typeof givenRpc.id === "string" || typeof givenRpc.id === "number"
				? givenRpc.id
				: NotGiven
			: NotGiven
	const toError: RpcAnswer = {} // possible error
	Object.defineProperty(toError, "primRpc", { value: PrimRpcSpecific, enumerable: false, writable: false })
	const toBase: Partial<T> = {} // possible valid call
	if (id !== NotGiven) {
		toError.id = id
		toBase.id = id
	}
	const prim = "prim" in givenRpc && typeof givenRpc.prim === "number" ? givenRpc.prim : NotGiven
	if (prim !== NotGiven) {
		toError.prim = prim as RpcBase["prim"]
		toBase.prim = prim as RpcBase["prim"]
	}
	return { toError, toBase, givenRpc }
}

/**
 * Check that given object is a valid RPC call
 *
 * @param given Possibly RPC, very possibly not
 * @returns Valid RPC call
 * @throws RPC response, an error
 */
export function checkRpcCall<
	T = unknown,
	V = T extends unknown[] ? RpcCall<string, unknown[]>[] : RpcCall<string, unknown[]>,
>(given: T): V {
	if (Array.isArray(given)) {
		return given.map(g => checkRpcCall(g)) as V
	}
	const { toError, toBase: toCall, givenRpc } = checkRpcBase<RpcCall>(given)
	const methodValid =
		"method" in givenRpc && typeof givenRpc.method === "string" && givenRpc.method.length > 0 && givenRpc.method
	if (!methodValid) {
		toError.error = "Invalid method name"
		throw toError
	}
	toCall.method = methodValid
	const argsValid = "args" in givenRpc ? (Array.isArray(givenRpc.args) ? givenRpc.args : [givenRpc.args]) : []
	toCall.args = argsValid
	return toCall as V
}

/**
 * Check that given response is valid RPC response
 *
 * @param given The result of RPC call, expected to follow response format
 * @returns Valid RPC result
 * @throws RPC response, an error
 */
export function checkRpcResult<T = unknown, V = T extends unknown[] ? RpcAnswer[] : RpcAnswer>(given: T): V {
	if (Array.isArray(given)) {
		return given.map(g => checkRpcResult(g)) as V
	}
	const { toError, toBase: toResult, givenRpc } = checkRpcBase<RpcAnswer>(given)
	const result = "result" in givenRpc ? givenRpc.result : NotGiven
	if (result !== NotGiven) {
		toResult.result = result
	}
	const error = "error" in givenRpc ? givenRpc.error : NotGiven
	if (error !== NotGiven) {
		toResult.error = error
	}
	if (result === NotGiven && error === NotGiven) {
		toError.error = "Invalid RPC result"
		throw toError
	}
	return toResult as V
}

// !SECTION

// SECTION: Validation of HTTP-like arguments/response
export function checkHttpLikeRequest(given: unknown, binary = false) {
	const toCall: Partial<CommonServerSimpleGivenOptions<typeof binary>> = {}
	const givenObject = typeof given === "object" && given !== null && given
	if (!givenObject) {
		throw { error: "Invalid request made by method/callback handler" }
	}
	const url = "url" in givenObject && typeof givenObject.url === "string" && givenObject.url
	if (url) {
		toCall.url = url
	}
	// binary body today is expected to be further processed by JSON handler
	const body =
		"body" in givenObject &&
		typeof givenObject.body === (binary ? "object" : "string") &&
		(givenObject.body as string | object)
	if (body) {
		toCall.body = body
	}
	if (!toCall.url && !toCall.body) {
		throw { error: "Either a URL or body must be given" }
	}
	const blobs = "blobs" in givenObject && typeof givenObject.blobs === "object" && givenObject.blobs
	if (blobs) {
		toCall.blobs = blobs as BlobRecords
	}
	const method = "method" in givenObject && typeof givenObject.method === "string" && givenObject.method
	// const validGET = method === "GET" && toCall.url
	// const validPOST = method === "POST" && toCall.body
	if (method) {
		toCall.method = method
	} else if (!toCall.body && toCall.url) {
		toCall.method = "GET"
	} else if (toCall.body) {
		toCall.method = "POST"
	} else {
		throw { error: "Method could not be inferred from method/callback handler" }
	}
	return toCall as CommonServerSimpleGivenOptions
}

export function checkHttpLikeResponse(given: unknown, binary = false): CommonServerResponseOptions {
	const toRespond: Partial<CommonServerResponseOptions<typeof binary>> = {}
	const givenObject = typeof given === "object" && given !== null && given
	if (!givenObject) {
		throw { error: "Internal error while transforming response" }
	}
	const body =
		"body" in givenObject &&
		typeof givenObject.body === (binary ? "object" : "string") &&
		(givenObject.body as string | object)
	if (body) {
		toRespond.body = body
	} else {
		throw { error: "Response was either not given or invalid type" }
	}
	const headers =
		"headers" in givenObject &&
		typeof givenObject.headers === "object" &&
		Object.entries(givenObject.headers)
			.map(([key, value]) => [key, typeof value === "string" ? value : NotGiven])
			.filter(([_key, value]) => value !== NotGiven).length > 0
			? (givenObject.headers as Record<string, string>)
			: NotGiven
	if (headers !== NotGiven) {
		toRespond.headers = headers
	} else {
		toRespond.headers = {}
	}
	const status = "status" in givenObject && typeof givenObject.status === "number" && givenObject.status
	if (status) {
		toRespond.status = status
	} else {
		throw { error: "Response status was not set" }
	}
	const blobs = "blobs" in givenObject && typeof givenObject.blobs === "object" && givenObject.blobs
	if (blobs) {
		toRespond.blobs = blobs as BlobRecords
	}
	return toRespond as CommonServerResponseOptions
}

/**
 * Validate functions use symbols (top-level only) for internal usage but these
 * aren't needed for any returned values.
 */
export function stripSymbols<T = unknown>(given: T) {
	if (typeof given === "object") {
		for (const [key, value] of Object.entries(given)) {
			if (typeof value === "symbol") {
				delete given[key]
			}
		}
	}
	return given
}

// !SECTION

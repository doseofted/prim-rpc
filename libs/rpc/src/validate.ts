import type {
	CommonServerResponseOptions,
	CommonServerSimpleGivenOptions,
	RpcAnswer,
	RpcBase,
	RpcCall,
} from "./interfaces"

const NotGiven = Symbol("unknown")

// SECTION: Validation of RPC calls and results

/** Check that RPC call/result is valid object with/without an ID */
function checkRpcBase<T extends RpcBase>(given: unknown) {
	const givenRpc = typeof given === "object" && given !== null && given
	if (!givenRpc) {
		throw { error: "Invalid RPC" }
	}
	const id =
		"id" in givenRpc
			? typeof givenRpc.id === "string" || typeof givenRpc.id === "number"
				? givenRpc.id
				: NotGiven
			: NotGiven
	const toError: RpcAnswer = {} // possible error
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
export function checkRpcCall<T = unknown, V = T extends unknown[] ? RpcCall[] : RpcCall>(given: T): V {
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
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { toError: _errorNotNeeded, toBase: toResult, givenRpc } = checkRpcBase<RpcAnswer>(given)
	const result = "result" in givenRpc ? givenRpc.result : NotGiven
	if (result !== NotGiven) {
		toResult.result = result
	}
	const error = "error" in givenRpc ? givenRpc.error : NotGiven
	if (error !== NotGiven) {
		toResult.error = error
	}
	if (result === NotGiven && error === NotGiven) {
		throw { error: "Invalid RPC result" }
	}
	return toResult as V
}

// !SECTION

// SECTION: Validation of HTTP-like arguments/response
export function checkHttpLikeRequest(given: unknown) {
	const toCall: Partial<CommonServerSimpleGivenOptions> = {}
	const givenObject = typeof given === "object" && given !== null && given
	if (!givenObject) {
		throw { error: "Invalid request made by method/callback handler" }
	}
	const url = "url" in givenObject && typeof givenObject.url === "string" && givenObject.url
	if (url) {
		toCall.url = url
	}
	const body = "body" in givenObject && typeof givenObject.body === "string" && givenObject.body
	if (body) {
		toCall.body = body
	}
	if (!toCall.url && !toCall.body) {
		throw { error: "Either a URL or body must be given" }
	}
	const method = "method" in givenObject && typeof givenObject.method === "string" && givenObject.method
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

export function checkHttpLikeResponse(given: unknown): CommonServerResponseOptions {
	const toRespond: Partial<CommonServerResponseOptions> = {}
	const givenObject = typeof given === "object" && given !== null && given
	if (!givenObject) {
		throw { error: "Internal error while transforming response" }
	}
	const body = "body" in givenObject && typeof givenObject.body === "string" && givenObject.body
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
	return toRespond as CommonServerResponseOptions
}

// !SECTION

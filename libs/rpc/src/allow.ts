// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

/**
 * Check that a function can be executed as RPC based on the given `.rpc` property. The `.rpc` property can be retrieved
 * from a function by calling `getFunctionRpcProperty()`.
 *
 * This compares the given `rpcSpecifier` with given request options (currently, only the `httpMethod`).
 *
 * By default, all requests sent over a network to Prim+RPC are POST-like:
 *
 * - When `.rpc` is `true`, the HTTP method must be `"POST"` when applicable or `false` (inapplicable, i.e. IPC)
 * - When `.rpc` is `"idempotent"` (a special keyword), the HTTP method may also be `"GET"`
 *
 * @param rpcSpecifier The value of a function's `.rpc` property
 * @param httpMethod The optional HTTP method used in a request
 * @returns whether function can be called based on given RPC property and given request options
 */
export function checkRpcIdentifier(rpcSpecifier: string | boolean, httpMethod: string | false) {
	const postMethodAllowed =
		typeof rpcSpecifier === "boolean" && rpcSpecifier && (httpMethod === "POST" || httpMethod === false)
	if (postMethodAllowed) return postMethodAllowed
	const getMethodAllowed =
		typeof rpcSpecifier === "string" &&
		rpcSpecifier === "idempotent" &&
		(typeof httpMethod === "string" ? ["GET", "POST"].includes(httpMethod) : httpMethod === false)
	if (getMethodAllowed) return getMethodAllowed
	return false
}

/**
 * Given a function, grab the `.rpc` property. **This does not check that the `.rpc` property is valid** only that it
 * exists and it is the expected scalar type.
 *
 * @param possibleFunction A possible function given on a module
 */
export function getFunctionRpcProperty(possibleFunction?: unknown) {
	return (
		typeof possibleFunction === "function" &&
		"rpc" in possibleFunction &&
		(typeof possibleFunction.rpc === "string" || typeof possibleFunction.rpc === "boolean") &&
		possibleFunction.rpc
	)
}

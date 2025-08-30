// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

/** @deprecated */
export const featureFlags = {
	/**
	 * This only works with the callback handler today. By default, Prim+RPC uses the available method plugin first if a
	 * callback is not provided as an argument to your function, however it's not known if a function returns multiple
	 * promises until the function is called.
	 *
	 * This means that receiving multiple promises inside of a result will not work with the method handler and there
	 * is not yet a way to upgrade from a method handler to the callback handler (on a network, HTTP -> WS) or a way to
	 * stream that data to the client using the method handler (because it takes a single request->response format today).
	 *
	 * To support this feature from the client (when this flag is enabled), you must either:
	 *
	 * - Have a callback in your function's arguments on the client (signaling to Prim+RPC that you want to use
	 *   the callback handler for this function)
	 * - Only use the callback plugin on the client (generally not recommended since that connection is persistent)
	 */
	supportMultiplePromiseResults: false,
}

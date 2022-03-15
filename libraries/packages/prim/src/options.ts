import { PrimOptions } from "./interfaces"
import defu from "defu"

/**
 * Set default options including creation of default clients used by Prim.
 *
 * @param options Given options by developer
 * @returns Options with defaults set
 */
export function createPrimOptions(options?: PrimOptions) {
	// first initialize given options and values for which to fallback
	const configured: PrimOptions = defu<PrimOptions, PrimOptions>(options, {
		// by default, it should be assumed that function is used client-side (assumed value for easier developer use from client-side)
		server: false,
		// if endpoint is not given then assume endpoint is relative to current url, following suggested `/prim` for Prim-RPC calls
		endpoint: "/prim", // NOTE this should be overridden on the client
		wsEndpoint: "/prim", // NOTE this should be overridden on the client too, since protocol is required anyway
		// `client()` is intended to be overridden so as not to force any one HTTP framework but default is fine for most cases
		client: async (endpoint, jsonBody) => {
			const result = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(jsonBody)
			})
			// RPC result should be returned on success and RPC error thrown if errored
			return JSON.parse(await result.text())
		},
		socket: (endpoint, { connected, response, ended }) => {
			const ws = new WebSocket(endpoint)
			ws.onopen = connected
			ws.onmessage = (({ data: message }) => {
				response(JSON.parse(message))
			})
			ws.onclose = ended
			const send = (msg: unknown) => {
				ws.send(JSON.stringify(msg))
			}
			return { send }
		},
		// these options should not be passed by a developer but are used internally
		internal: {}
	})
	return configured
}

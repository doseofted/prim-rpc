import { PrimOptions, PrimServerOptions } from "./interfaces"
import { defu } from "defu"

// TODO: consider separating server-specific options from client options so I can reduce the number
// of options given on the client

const createBaseClientOptions = (): PrimOptions => ({
	// SECTION: client
	// if endpoint is not given then assume endpoint is relative to current url, following suggested `/prim` for Prim-RPC calls
	endpoint: "/prim",
	// if not provided, Prim will try to use endpoint as websocket (useful when http/ws are on same path)
	wsEndpoint: "",
	// batch time of 0 turns off batching while anything > 0 batches requests
	clientBatchTime: 0,
	// allow options of using a different JSON parsing/conversion library (for instance, "superjson")
	// TODO: allow interface to be passed as generic from client so custom JSON options can be used such as parse options, if provided by library
	jsonHandler: JSON,
	// `client()` is intended to be overridden so as not to force any one HTTP framework but default is fine for most cases
	client: async (endpoint, jsonBody, jsonHandler) => {
		const result = await fetch(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: jsonHandler.stringify(jsonBody),
		})
		return jsonHandler.parse(await result.text())
	},
	// same with socket, usually the default WebSocket client is fine but the choice to change should be given
	socket: (endpoint, { connected, response, ended }, jsonHandler) => {
		const ws = new WebSocket(endpoint)
		ws.onopen = connected
		ws.onclose = ended
		ws.onmessage = (({ data: message }) => {
			response(jsonHandler.parse(message as string))
		})
		const send = (msg: unknown) => {
			ws.send(jsonHandler.stringify(msg))
		}
		return { send }
	},
	// !SECTION
	// SECTION Client and server
	// these options should not be passed by a developer but are used internally
	internal: {},
	// !SECTION
})

const createBaseServerOptions = (): PrimServerOptions => ({
	...createBaseClientOptions(),
	// the default prefix will likely be overridden
	prefix: "/prim",
	callbackHandler() {
		console.log("Prim-RPC's callback handler was not implemented")
	},
	methodHandler() {
		console.log("Prim-RPC's callback handler was not implemented")
	},
})


/**
 * Set default options including creation of default clients used by Prim.
 *
 * @param options Given options by developer
 * @returns Options with defaults set
 */
export function createPrimOptions<OptionsType extends PrimOptions = PrimOptions>(options?: OptionsType, server = false) {
	// first initialize given options and values for which to fallback
	const baseOptions = !server ? createBaseServerOptions() : createBaseClientOptions()
	const configured = defu<PrimOptions, PrimOptions>(options, baseOptions) as OptionsType
	return configured
}

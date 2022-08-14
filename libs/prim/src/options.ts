import { PrimOptions } from "./interfaces"
import { defu } from "defu"

// TODO: consider separating server-specific options from client options so I can reduce the number
// of options given on the client

const baseOptions = (): PrimOptions =>({
	// TODO: add fallback presets for "development" and "production"
	// preset: "development",
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
			// NOTE: binary data is not expected so message should be passed to JSON handler as a string
			response(jsonHandler.parse(String(message)))
		})
		const send = (msg: unknown) => {
			ws.send(jsonHandler.stringify(msg))
		}
		return { send }
	},
})

/**
 * Set default options including creation of default clients used by Prim.
 *
 * @param options Given options by developer
 * @returns Options with defaults set
 */
export function createPrimOptions<OptionsType extends PrimOptions = PrimOptions>(options?: OptionsType) {
	// first initialize given options and values for which to fallback
	const configured = defu<PrimOptions, PrimOptions>(options, {
		...baseOptions(),
		// these options should not be passed by a developer but are used internally
		internal: {},
	}) as OptionsType
	return configured
}

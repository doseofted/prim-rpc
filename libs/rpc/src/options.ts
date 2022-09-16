import { PrimOptions, PrimServerOptions, RpcCall } from "./interfaces"
import { defu } from "defu"

// TODO: consider separating server-specific options from client options so I can reduce the number
// of options given on the client
// TODO: add presets option for dev and production to configure which fallback settings to use when not provided

const createBaseClientOptions = (): PrimOptions => ({
	// SECTION: client
	// if endpoint is not given then assume endpoint is relative to current url, following suggested `/prim` for Prim-RPC calls
	endpoint: "/prim",
	// if not provided, Prim will try to use endpoint as websocket (useful when http/ws are on same path)
	wsEndpoint: "",
	// batch time of 0 turns off batching while anything > 0 batches requests
	clientBatchTime: 0,
	// allow options of using a different JSON parsing/conversion library (for instance, "superjson")
	// NOTE: JSON properties are not enumerable so create an object with enumerable properties referencing JSON methods
	jsonHandler: { stringify: JSON.stringify, parse: JSON.parse },
	// `client()` is intended to be overridden so as not to force any one HTTP framework but default is fine for most cases
	// eslint-disable-next-line @typescript-eslint/require-await
	client: async (_endpoint, jsonBody) => {
		const error = "Prim-RPC's client plugin was not provided"
		if (Array.isArray(jsonBody)) {
			return jsonBody.map(({ id })=> ({ id, error }))
		}
		return { error, id: jsonBody.id }
	},
	// same with socket, usually the default WebSocket client is fine but the choice to change should be given
	socket: (_endpoint, { response }) => {
		const error = "Prim-RPC's socket plugin was not provided"
		const send = (msg: RpcCall) => {
			response({ id: msg.id, error })
		}
		return { send }
	},
	// Stringified Errors with the default JSON handler are empty objects
	// Empty errors could be a source of confusion if an end-user doesn't receive an error on the client when one is
	// thrown from the server so set this to `true` (if presets are used, this may be set to `false` for
	// "production" settings)
	handleError: true,
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
		console.debug("Prim-RPC's callback handler was not implemented")
	},
	methodHandler() {
		console.debug("Prim-RPC's method handler was not implemented")
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
	const overrideBaseOptions = {} as OptionsType
	if (options?.jsonHandler) {
		overrideBaseOptions.handleError = false
	}
	const baseOptions = server ? createBaseServerOptions() : createBaseClientOptions()
	const configured = defu<PrimOptions, PrimOptions[]>(options, overrideBaseOptions, baseOptions) as OptionsType
	return configured
}

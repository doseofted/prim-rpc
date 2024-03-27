// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { defu } from "defu"
import { destr } from "destr"
import { PrimOptions, PrimServerOptions, RpcCall } from "./interfaces"

/**
 * As Prim+RPC introduces new updates to RPC message structure, update this version.
 * Don't update just because major version changes though (only if version changes RPC structure)
 */
export const primMajorVersion = 0
// NOTE: I'm still undecided if version should be in RPC at all (this should probably be moved to communication channel
// instead since it's not related to RPC itself but rather how RPC is transferred)
/** Only show version in RPC if structure of message has changed (and would be incompatible with old Prim+RPC versions) */
export const useVersionInRpc = primMajorVersion !== 0

// TODO: consider separating server-specific options from client options so I can reduce the number
// of options given on the client
// TODO: add presets option for dev and production to configure which fallback settings to use when not provided

// NOTE: The Prim client could be instantiated from the Prim server (since Prim server will use Prim client if module is not provided directly)
// This may not be clear to someone utilizing Prim RPC for IPC (where error may appear to come from client but is actually from server)
// The `server` parameter below is used to give more specific error messages to developer utilizing Prim RPC
const createBaseClientOptions = (server = false): PrimOptions => ({
	// SECTION: client
	// TODO: consider moving `endpoint` and `wsEndpoint` to plugins since this is generally HTTP-specific (server uses this as well though)
	// if endpoint is not given then assume endpoint is relative to current url, following suggested `/prim` for Prim-RPC calls
	endpoint: "/prim",
	// if not provided, Prim will try to use endpoint as websocket (useful when http/ws are on same path)
	wsEndpoint: "",
	// batch time of 0 turns off batching while anything > 0 batches requests
	clientBatchTime: 0,
	// allow options of using a different JSON parsing/conversion library (for instance, "superjson")
	// NOTE: JSON properties are not enumerable so create an object with enumerable properties referencing JSON methods
	jsonHandler: { stringify: JSON.stringify, parse: destr, binary: false, mediaType: "application/json" },
	// `client()` is intended to be overridden so as not to force any one HTTP framework but default is fine for most cases
	// eslint-disable-next-line @typescript-eslint/require-await -- Type definitions expects async function (even if not needed here)
	methodPlugin: async (_endpoint, jsonBody) => {
		const error = `Prim-RPC's method plugin was not provided (${server ? "server" : "client"})`
		if (Array.isArray(jsonBody)) {
			const result = jsonBody.map(({ id }) => ({ id, error }))
			return { result }
		}
		const result = { error, id: jsonBody.id }
		return { result }
	},
	// same with socket, usually the default WebSocket client is fine but the choice to change should be given
	callbackPlugin: (_endpoint, { response }) => {
		const error = `Prim-RPC's callback plugin was not provided (${server ? "server" : "client"})`
		const send = (msg: RpcCall) => {
			response({ id: msg.id, error })
		}
		return { send }
	},
	// a developer may specify an allow list if there's not direct access to the module
	allowList: {},
	// by default, only functions provided can be called (not their methods, if any are defined)
	methodsOnMethods: {},
	// Stringified Errors with the default JSON handler are empty objects
	// Empty errors could be a source of confusion if an end-user doesn't receive an error on the client when one is
	// thrown from the server so set this to `true` (if presets are used, this may be set to `false` for
	// "production" settings)
	handleError: true,
	// the error stack shouldn't be shown in production (but can be enabled in development)
	// NOTE: in the future, this option should probably move so that it isn't dependent on `handleError` option
	showErrorStack: false,
	// Assume that default JSON handler is used and handle blobs separately from JSON
	handleBlobs: true,
	// !SECTION
	// SECTION Client and server
	// these options should not be passed by a developer but are used internally
	internal: {},
	flags: {
		supportMultiplePromiseResults: false,
	},
	// !SECTION
})

const createBaseServerOptions = (): PrimServerOptions => ({
	...createBaseClientOptions(true),
	// the default prefix will likely be overridden
	prefix: "/prim",
	callbackHandler() {
		// console.debug("Prim-RPC's callback handler was not implemented")
	},
	methodHandler() {
		// console.debug("Prim-RPC's method handler was not implemented")
	},
})

/**
 * Set default options including creation of default clients used by Prim.
 *
 * @param options Given options by developer
 * @returns Options with defaults set
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPrimOptions<OptionsType extends PrimOptions<any, any, any> = PrimOptions>(
	options?: OptionsType,
	server = false
) {
	// first initialize given options and values for which to fallback
	const overrideBaseOptions: Partial<OptionsType> = {}
	if (options?.jsonHandler) {
		overrideBaseOptions.handleError = false
	}
	const baseOptions = server ? createBaseServerOptions() : createBaseClientOptions()
	const configured = defu<PrimOptions, PrimOptions[]>(options, overrideBaseOptions, baseOptions) as OptionsType
	return configured
}

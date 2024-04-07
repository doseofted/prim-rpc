// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { PartialDeep, Schema } from "type-fest"
import type {
	PossibleModule,
	RpcMethodSpecifier,
	RpcModule,
	WithoutFunctionWrapper,
	WithoutPromiseWrapper,
} from "../types/rpc-module"
import type { ResolverClient, ResolverServer } from "../resolver/types"

/**
 * An object conforming to `JSON` (with `parse` and `stringify` methods) that implements serialization/deserialization
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TransformHandler<StringifyType extends string = any> = {
	/** Convert JavaScript object into a transport-friendly format */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	stringify: (value: any) => StringifyType
	/** Convert transport-friendly format into JavaScript object */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	parse: (text: StringifyType) => any
	/** Optionally, define transport media type */
	// eslint-disable-next-line @typescript-eslint/ban-types -- `string & {}` is needed for helpful type hints
	mediaType?: "application/json" | "application/octet-stream" | "application/yaml" | "text/xml" | (string & {})
	/** Optional flag to determine if media is in binary format */
	binary?: boolean
}

export interface ProvidedClientOptions<
	GivenModule extends PossibleModule = PossibleModule,
	FormHandling extends boolean = boolean,
> {
	/**
	 * Optionally provide a module to the RPC client. This module will be utilized before sending RPC to the server.
	 * If a method isn't given on the module, it is sent as RPC to the server. This is useful during SSR when a client
	 * has access to the module server-side but not client-side. It may also be useful for sharing isomorphic utilities
	 * between the server and client.
	 *
	 * @default null
	 */
	// The module may be given as a dynamic import or only partially: support various wrappers around the `GivenModule`
	module?:
		| (() => Promise<PartialDeep<WithoutPromiseWrapper<WithoutFunctionWrapper<GivenModule>>>>)
		| Promise<PartialDeep<WithoutPromiseWrapper<WithoutFunctionWrapper<GivenModule>>>>
		| PartialDeep<WithoutPromiseWrapper<WithoutFunctionWrapper<GivenModule>>>
		| null
	/**
	 * RPC can be sent in batches to the server when this option is set, depending on the transport used to send RPC.
	 * Time duration, given in milliseconds, determines how long to wait before sending a batch of RPC to the server.
	 * It is recommended to keep this duration very low (under `100` milliseconds).
	 *
	 * @default false
	 */
	batchTime?: number | false
	/**
	 * Methods to serialize and deserialize JavaScript objects, conforming to the `JSON` interface. By default, the `JSON`
	 * object is utilized and will convert RPC to/from JSON. Serialization is not limited to JSON: you may use well-known
	 * formats like MessagePack, YAML, XML, or others.
	 *
	 * The default transform uses the `destr` package for serialization (in place of `JSON.parse`) and `JSON.stringify`
	 * for deserialization.
	 *
	 * @default ```ts
	 * { stringify: JSON.stringify, parse: destr, binary: false, mediaType: "application/json" }
	 * ```
	 */
	transformHandler?: TransformHandler
	/**
	 * Module methods cannot be called by default, they must explicitly be marked as RPC.For methods to be considered RPC,
	 * they must either (a) define a property `.rpc` on itself or (b) have its method name listed in the allow list
	 * (this option). This allow list follows the schema of the module provided.
	 *
	 * Setting a method to `true` will allow client-side access to server-side functions (if over HTTP: using POST
	 * requests). You may optionally set a method to be `"idempotent"` to reflect that the method may be called multiple
	 * times without side effects (if over HTTP: using POST requests or, optionally, a GET requests).
	 *
	 * @default {}
	 */
	allowSchema?: PartialDeep<Schema<RpcModule<GivenModule, false, false>, RpcMethodSpecifier>>
	/**
	 * Functions in JavaScript are objects and can have other properties or methods defined on them. By default, these
	 * methods (on other methods) cannot be called as RPC. You may set a key/value pair of global method names (the keys)
	 * allowed on any method given in the module as `true` or `"idempotent"` (the value).
	 *
	 * Note that some built-in methods are disallowed regardless of this setting (for instance: `call`, `apply`, `bind`).
	 *
	 * @default {}
	 */
	allowedMethodsOnMethod?: { [methodName: string]: RpcMethodSpecifier }
	/**
	 * A group of error-specific options when handling RPC errors. Set to `true` to enable the default set of rules below
	 * or set to `false` to disable error handling. More granular options are available by setting to an object.
	 *
	 * @default { enabled: true, stackTrace: false }
	 */
	handleErrors?:
		| boolean
		| {
				/**
				 * When a module's method throws an error on the server, the RPC client catches that error to transport it to
				 * the client. When this option is set to `true`, the error will be transformed into a JSON representation and
				 * reconstructed on the client. When set to `false`, the error will be forwarded to your Transform Handler
				 * (by default, the `JSON` object which will turn the error into an empty object: `{}`).
				 *
				 * If your Transform Handler already supports Error-like objects or you do not wish to send error details to the
				 * client, you may disable this option.
				 *
				 * @default true
				 */
				enabled: true
				/**
				 * When `error.handling` is `true`, this option determines if the error's stack trace (if any) is included in
				 * the RPC result. It is recommended that this option is only enabled conditionally during development.
				 *
				 * @default false
				 */
				stackTrace?: boolean
		  }
		| { enabled: false }
	/**
	 * Whether binary types should be extracted from RPC for transport, depending on if the transport supports the
	 * separated blobs. By default, binary types like `File` and `Blob` are extracted from generated RPC before being
	 * sent over your chosen transport. This is useful when using `JSON` as a Transform Handler since JSON cannot handle
	 * binary files but transports like HTTP can do so (for instance, using multipart form data).
	 *
	 * If your JSON handler does support binary files or you have no intention of handling binary files, you may disable
	 * this option.
	 *
	 * @default true
	 */
	handleBlobs?: boolean
	/**
	 * By default, all methods called from the RPC client accept `FormData`, `HTMLFormElement` or `SubmitEvent` object
	 * types as an argument. Items in HTML forms will be transformed into a regular JavaScript object with keys that that
	 * match the form input names. This allows the client to easily be used with forms without manual transformations.
	 *
	 * If you'd like to transform FormData manually using a custom Transform Handler or skip handling of HTML forms,
	 * you may disable this option.
	 *
	 * @default true
	 */
	handleForms?: FormHandling
	/**
	 * Special types such as Files/Blobs are extracted from given arguments/return values up to a certain depth
	 * (nested objects and arrays). The default limit is `3` but this may be set lower to optimize performance or higher
	 * to catch all nested, special types.
	 *
	 * @default 3
	 */
	handlingDepth?: number
	/**
	 * A plugin (or list of available plugins) used to send RPC and receive RPC results.
	 */
	resolverClient?: null | ResolverClient | ResolverClient[]
	/**
	 * Transform given arguments prior to calling a function. This hook may alternatively intercept a function call and
	 * return a result early. This hook returns an object with either `.args` or `.result`, otherwise this function should
	 * return void to continue with the original arguments.
	 *
	 * This may be useful for logging, caching, or other pre-processing of RPC calls.
	 *
	 * @default undefined
	 */
	onPreCall?: (
		args: unknown[],
		name: string,
		props: Record<PropertyKey, unknown>
	) => { result?: unknown; args: unknown[] } | Promise<{ result?: unknown; args: unknown[] }> | void
	/**
	 * Transform given result prior to being returned to the function caller. If an object with `.result` is returned,
	 * the return value will be modified, otherwise this function should return void to continue with original return
	 * value. If the result is a thrown error, this hook will not be called and an error will be thrown at the call site.
	 *
	 * This may be useful for logging, caching, or other post-processing of RPC results.
	 *
	 * @default undefined
	 */
	onPostCall?: (
		args: unknown[],
		result: unknown,
		name: string,
		props: Record<PropertyKey, unknown>
	) => { result?: unknown } | Promise<{ result?: unknown }> | void
	/**
	 * Transform given error prior to being thrown to the RPC caller. A returned object with `.error` will be thrown as
	 * the new error, otherwise this function should return void to continue with the original error. While it's also
	 * possible to throw in this hook, it's recommended to return an object with `.error`.
	 *
	 * This hook may be useful for invalidating cache or global handling of errors in an app.
	 *
	 * @default undefined
	 */
	onCallError?: (error: unknown, name: string) => { error?: unknown } | Promise<{ error?: unknown }> | void
}

export interface ProvidedServerOptions<
	GivenModule extends PossibleModule = PossibleModule,
	FormHandling extends boolean = boolean,
> extends ProvidedClientOptions<GivenModule, FormHandling> {
	/**
	 * A plugin (or list of available plugins) used to receive RPC and send RPC results.
	 */
	resolverServer?: null | ResolverServer | ResolverServer[]
}

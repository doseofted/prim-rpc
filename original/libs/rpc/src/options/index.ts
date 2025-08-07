// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { defu } from "defu"
import { destr } from "destr"
import type { ProvidedServerOptions } from "./provided"
import type { SetRequired } from "type-fest"

const defaults = {
	transformHandler: {
		stringify: JSON.stringify,
		parse: destr,
		binary: false,
		mediaType: "application/json",
	},
	handleErrors: { enabled: true, stackTrace: false },
	resolverClient: null,
	resolverServer: null,
} satisfies ProvidedServerOptions

type MergeOptions = Omit<ProvidedServerOptions, keyof typeof defaults>

export function createOptions(provided: ProvidedServerOptions = {}) {
	const {
		transformHandler = defaults.transformHandler,
		handleErrors = defaults.handleErrors,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		resolverClient = defaults.resolverClient,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		resolverServer = defaults.resolverServer,
		...providedMerge
	} = provided
	const merged = defu<MergeOptions, MergeOptions[]>(providedMerge, {
		module: null,
		allowSchema: {},
		allowedMethodsOnMethod: {},
		batchTime: false,
		handleBlobs: true,
		handleForms: true,
		handlingDepth: 3,
	})
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	return { ...merged, handleErrors, transformHandler, resolverClient, resolverServer } as InitializedOptions
}

/** Options utilized internally by client/server (some values will be set to defaults) */
export type InitializedOptions = SetRequired<
	ProvidedServerOptions,
	| "transformHandler"
	| "handleErrors"
	| "module"
	| "allowSchema"
	| "allowedMethodsOnMethod"
	| "batchTime"
	| "handleBlobs"
	| "handleForms"
	| "handlingDepth"
	| "resolverClient"
	| "resolverServer"
>

// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { defu } from "defu"
import { UserProvidedClientOptions } from "./provided"
import { destr } from "destr"

const defaults = {
	transformHandler: {
		stringify: JSON.stringify,
		parse: destr,
		binary: false,
		mediaType: "application/json",
	},
	handleErrors: { enabled: true, stackTrace: false },
}

type MergeOptions = Omit<UserProvidedClientOptions, keyof typeof defaults>

export function createClientOptions(provided: UserProvidedClientOptions = {}) {
	const {
		transformHandler = defaults.transformHandler,
		handleErrors = defaults.handleErrors,
		...providedMerge
	} = provided
	const merged = defu<MergeOptions, MergeOptions[]>(providedMerge, {
		module: null,
		allowSchema: {},
		allowedMethodsOnMethod: {},
		batchTime: false,
		handleBlobs: true,
		handleForms: true,
	})
	return { ...merged, handleErrors, transformHandler }
}

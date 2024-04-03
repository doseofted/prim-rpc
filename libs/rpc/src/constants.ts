// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { nanoid } from "nanoid"

/** Placeholder names for extracted values from RPC */
export enum RpcPlaceholder {
	CallbackPrefix = "cb",
	BinaryPrefix = "bin",
	PromisePrefix = "prom",
}

/** Generate an identifier with the given prefix and, optionally, identifier (default is randomly generated) */
export function generateId(type: RpcPlaceholder, id?: string) {
	return `_${type}_${id ?? nanoid()}`
}

/** Used to place `given` prefix into prefix format: `_${given}_` _without_ an identifier */
export function resolvePlaceholder(given: RpcPlaceholder) {
	return generateId(given, "")
}

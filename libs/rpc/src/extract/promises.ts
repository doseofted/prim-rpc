// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { RpcPlaceholder } from "../constants"

function isPromise(given: unknown) {
	return given instanceof Promise ? given : false
}

export function promiseIdentifier(given: unknown) {
	if (isPromise(given)) return RpcPlaceholder.PromisePrefix
}

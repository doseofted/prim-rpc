// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { RpcPlaceholder } from "../constants"

function isCallback(given: unknown) {
	return typeof given === "function" ? given : false
}

export function callbackIdentifier(given: unknown) {
	if (isCallback(given)) return RpcPlaceholder.CallbackPrefix
}

// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { givenFormLike, handlePossibleForm } from "../extract/blobs"
import { JsonHandler, PrimOptions } from "../interfaces"
import { RpcCall } from "../types/rpc-structure"
import { PossibleModule } from "../types/rpc-module"

export function handleRemoteModuleMethod(
	rpc: RpcCall<string, unknown[]>,
	options: PrimOptions<PossibleModule, JsonHandler>,
	nextToken?: symbol
) {
	const preprocessed = options.preRequest?.(rpc.args, rpc.method) || { args: rpc.args }
	if (options.handleForms && Array.isArray(preprocessed.args) && givenFormLike(preprocessed.args[0])) {
		preprocessed.args[0] = handlePossibleForm(preprocessed.args[0])
	}
	if ("result" in preprocessed) {
		return options.postRequest?.(preprocessed.args, preprocessed.result, rpc.method) ?? preprocessed.result
	}
	// TODO: handle more types from RPC (callbacks and blobs)
	const newRpc: RpcCall = {
		...rpc,
		args: preprocessed.args,
	}

	throw "not implemented yet"
	// const result: unknown = null
	// return options.postRequest?.(preprocessed.args, result, rpc.method) ?? result
}

// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { givenFormLike, handlePossibleForm } from "../extract/blobs"
import { RpcCall } from "../types/rpc-structure"
import { handlePotentialPromise } from "./wrapper"
import { InitializedOptions } from "../options"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function preprocessRecursive(rpc: RpcCall, options: InitializedOptions): RpcCall | Promise<RpcCall> {
	const _result = handlePotentialPromise(
		() => options.onPreCall?.(rpc.args, rpc.method, {}) || { args: rpc.args },
		preprocessed => {
			if (options.handleForms && "args" in preprocessed && givenFormLike(preprocessed.args[0])) {
				preprocessed.args[0] = handlePossibleForm(preprocessed.args[0])
			}
			if ("result" in preprocessed) return preprocessed.result

			const result = "result" in preprocessed ? preprocessed.result : handleProcessedRpc()
			return handlePotentialPromise(
				() => options.onPostCall?.(preprocessed.args, result, rpc.method, {}) || { result },
				postprocessed => {
					if ("result" in postprocessed) return postprocessed.result
				}
			)
		},
		error => {
			return handlePotentialPromise(
				() => options.onCallError?.(error, rpc.method) || { error },
				processedError => {
					if (processedError.error) throw processedError.error
				}
			)
		}
	)
	// return handlePotentialPromise(() => result, result => {})
	if (Array.isArray(rpc.chain) && rpc.chain.length > 0) {
		const newChain = rpc.chain.map(chain => preprocessRecursive(chain, options))
		if (newChain.some(c => c instanceof Promise)) {
			return handlePotentialPromise(
				() => Promise.all(newChain),
				allResolved => {
					rpc.chain = allResolved
					return rpc
				}
			)
		}
		return rpc
	}
	return rpc
}

function handleProcessedRpc() {}

export function handleRemoteModuleMethod(
	rpc: RpcCall<string, unknown[]>,
	options: InitializedOptions,
	_nextToken?: symbol
) {
	return handlePotentialPromise(
		() => options.onPreCall?.(rpc.args, rpc.method, {}) || { args: rpc.args },
		preprocessed => {
			if (options.handleForms && "args" in preprocessed && givenFormLike(preprocessed.args[0])) {
				preprocessed.args[0] = handlePossibleForm(preprocessed.args[0])
			}
			const result = "result" in preprocessed ? preprocessed.result : handleProcessedRpc()
			return handlePotentialPromise(
				() => options.onPostCall?.(preprocessed.args, result, rpc.method, {}) || { result },
				postprocessed => {
					if ("result" in postprocessed) return postprocessed.result
				}
			)
		},
		error => {
			return handlePotentialPromise(
				() => options.onCallError?.(error, rpc.method) || { error },
				processedError => {
					if (processedError.error) throw processedError.error
				}
			)
		}
	)

	// const result: unknown = null
	// return options.postRequest?.(preprocessed.args, result, rpc.method) ?? result
}

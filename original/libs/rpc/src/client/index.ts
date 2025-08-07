// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-unused-vars */
import { createMethodCatcher } from "./proxy"
import { handlePotentialPromise } from "./wrapper"
import { getUnfulfilledModule, handleLocalModuleMethod } from "./local"
import type { RpcModule, PossibleModule } from "../types/rpc-module"
import type { MergeModuleMethods } from "../types/merge"
import type { ProvidedClientOptions } from "../options/provided"
import { createOptions } from "../options"

export function createRpcClient<
	ModuleType extends PossibleModule = never,
	GivenOptions extends ProvidedClientOptions = ProvidedClientOptions,
>(options?: GivenOptions) {
	const optionsInit = createOptions(options)
	// the returned client will catch all method calls given on it recursively
	type FinalModule = MergeModuleMethods<
		// eslint-disable-next-line @typescript-eslint/ban-types
		[ModuleType] extends [never] ? {} : RpcModule<ModuleType, GivenOptions["handleForms"], true>,
		RpcModule<GivenOptions["module"], GivenOptions["handleForms"], false>
	>
	return createMethodCatcher<FinalModule>({
		onMethod(rpc, next) {
			// if module method was provided (and is not dynamic import), intercept call and return synchronously
			if (getUnfulfilledModule(optionsInit.module) instanceof Promise) return next
			const given = handleLocalModuleMethod(rpc, optionsInit, next)
			// because the module is not a dynamic import (Promise), we can safely check for the "next" token synchronously
			if (given === next) return next
			return given
		},
		onAwaited(rpc, next) {
			return handlePotentialPromise(
				() => handleLocalModuleMethod(rpc, optionsInit, next),
				localResult => {
					if (localResult !== next) return localResult
					// TODO: handle RPC (provide promise that resolves for server events)
					throw "not implemented yet"
				}
			)
		},
		onIterable(rpc, next) {
			// first determine if iterable result is given on local module
			if (getUnfulfilledModule(optionsInit.module) instanceof Promise) return next
			const given = handleLocalModuleMethod(rpc, optionsInit, next)
			if (given === next) return next
			if (typeof given === "object" && (Symbol.iterator in given || Symbol.asyncIterator in given)) return given
			// TODO: handle RPC (provide async iterable that iterates on server events)
			throw "not implemented yet"
		},
	})
}

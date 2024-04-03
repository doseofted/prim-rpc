// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-unused-vars */
import { createPrimOptions } from "../options"
import { createMethodCatcher } from "./proxy"
import { handlePotentialPromise } from "./wrapper"
import { getUnfulfilledModule, handleLocalModuleMethod } from "./local"
import type { RpcModule, PossibleModule } from "../types/rpc-module"
import type { MergeModuleMethods } from "../types/merge"
import type { UserProvidedClientOptions } from "../options/client/provided"

export function createRpcClient<
	ModuleType extends PossibleModule = never,
	GivenOptions extends UserProvidedClientOptions = UserProvidedClientOptions,
>(options?: GivenOptions) {
	options = createPrimOptions<GivenOptions>(options)
	// the returned client will catch all method calls given on it recursively
	type FinalModule = MergeModuleMethods<
		RpcModule<ModuleType, GivenOptions["handleForms"], true>,
		RpcModule<GivenOptions["module"], GivenOptions["handleForms"], false>
	>
	return createMethodCatcher<FinalModule>({
		onMethod(rpc, next) {
			// if module method was provided (and is not dynamic import), intercept call and return synchronously
			if (getUnfulfilledModule(options.module) instanceof Promise) return next
			const given = handleLocalModuleMethod(rpc, options, next)
			// because the module is not a dynamic import (Promise), we can safely check for the "next" token synchronously
			if (given === next) return next
			return given
		},
		onAwaited(rpc, next) {
			const localResult = handleLocalModuleMethod(rpc, options, next)
			return handlePotentialPromise(localResult, localResult => {
				if (localResult !== next) return localResult
				// TODO: handle RPC (provide promise that resolves for server events)
				throw "not implemented yet"
			})
		},
		onIterable(rpc, next) {
			// first determine if iterable result is given on local module
			if (getUnfulfilledModule(options.module) instanceof Promise) return next
			const given = handleLocalModuleMethod(rpc, options, next)
			if (given === next) return next
			if (typeof given === "object" && (Symbol.iterator in given || Symbol.asyncIterator in given)) return given
			// TODO: handle RPC (provide async iterable that iterates on server events)
			throw "not implemented yet"
		},
	})
}

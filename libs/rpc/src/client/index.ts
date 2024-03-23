/* eslint-disable @typescript-eslint/no-unused-vars */
import type { PrimOptions, PromisifiedModule } from "../interfaces"
import { createPrimOptions } from "../options"
import { isDefined } from "emery"
import { createMethodCatcher } from "./proxy"
import { handlePotentialPromise } from "./wrapper"
import { getUnfulfilledModule, handleLocalModule } from "./local"

export function createPrimClient<
	ModuleType extends GivenOptions["module"],
	OverrideModule extends GivenOptions["module"] = never,
	GivenOptions extends PrimOptions = PrimOptions,
>(options?: GivenOptions) {
	options = createPrimOptions<GivenOptions>(options)
	const providedModule = getUnfulfilledModule(options.module)
	const providedMethodPlugin = isDefined(options.methodPlugin)
	const providedCallbackPlugin = isDefined(options.callbackPlugin)
	// the returned client will catch all method calls given on it recursively
	return createMethodCatcher<PromisifiedModule<ModuleType, OverrideModule>>({
		onMethod(rpc, next) {
			// if module method was provided (and is not dynamic import), intercept call and return synchronously
			if (providedModule instanceof Promise) return next
			const given = handleLocalModule(rpc, options, next)
			// because the module is not a dynamic import (Promise), we can safely check for the "next" token synchronously
			if (given === next) return next
			return given
		},
		onAwaited(rpc, next) {
			const localResult = handleLocalModule(rpc, options, next)
			return handlePotentialPromise(localResult, localResult => {
				if (localResult !== next) return localResult
				throw "not implemented yet"
			})
		},
	})
}

/* eslint-disable @typescript-eslint/no-unused-vars */
import {
	FunctionAndForm,
	type JsonHandler,
	type PossibleModule,
	type PrimOptions,
	type PromisifiedModule,
	type RemoveDynamicImport,
	type RemoveFunctionWrapper,
} from "../interfaces"
import { createPrimOptions } from "../options"
import { isDefined } from "emery"
import { createMethodCatcher } from "./proxy"
import { handlePotentialPromise } from "./wrapper"
import { getUnfulfilledModule, handleLocalModule } from "./local"
import { MergeModuleMethods } from "../types/merge"

export function createPrimClient<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
	ModuleType extends PossibleModule = never,
	GivenOptions extends PrimOptions = PrimOptions<PossibleModule, JsonHandler, boolean>,
>(options?: GivenOptions) {
	options = createPrimOptions<GivenOptions>(options)
	const providedModule = getUnfulfilledModule(options.module)
	const providedMethodPlugin = isDefined(options.methodPlugin)
	const providedCallbackPlugin = isDefined(options.callbackPlugin)
	// the returned client will catch all method calls given on it recursively
	type FinalModule = MergeModuleMethods<
		PromisifiedModule<ModuleType, GivenOptions["handleForms"], true>,
		PromisifiedModule<GivenOptions["module"], GivenOptions["handleForms"], false>
	>
	return createMethodCatcher<FinalModule>({
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

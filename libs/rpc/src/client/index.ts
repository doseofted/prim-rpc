/* eslint-disable @typescript-eslint/no-unused-vars */
import type { AnyFunction, JsonHandler, PrimOptions, PromisifiedModule, RpcCall } from "../interfaces"
import { createPrimOptions } from "../options"
import { isDefined } from "emery"
import { createMethodCatcher } from "./proxy"
import getProperty from "just-safe-get"
import { handlePotentialPromise } from "./wrapper"

/** Determine if given RPC can be resolved using a method on the locally provided module */
function findOnProvidedModule(rpc: RpcCall<string, unknown[]>, module: object | Promise<object>): AnyFunction {
	return handlePotentialPromise(module, module => {
		const method = getProperty(module ?? {}, rpc.method) as AnyFunction
		if (method) return method
	})
}

export function createPrimClient<
	ModuleType extends PrimOptions["module"] = object,
	JsonHandlerType extends PrimOptions["jsonHandler"] = JsonHandler,
>(options?: PrimOptions<ModuleType, JsonHandlerType>) {
	options = createPrimOptions<PrimOptions<ModuleType, JsonHandlerType>>(options)
	// const providedModule = unwrapModule(options.module)
	const providedMethodPlugin = isDefined(options.methodPlugin)
	const providedCallbackPlugin = isDefined(options.callbackPlugin)
	return createMethodCatcher<PromisifiedModule<ModuleType>>({
		onMethod(rpcRaw, next) {
			const found = findOnProvidedModule(rpcRaw, options.module)
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			if (found) return found(...rpcRaw.args)
			return next
		},
		onAwaited(rpcRaw, _next) {
			const found = findOnProvidedModule(rpcRaw, options.module)
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			if (found) return found(...rpcRaw.args)
			console.log(rpcRaw)
			throw "not implemented yet"
		},
	})
}

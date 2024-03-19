/* eslint-disable @typescript-eslint/no-unused-vars */
import type { JsonHandler, PrimOptions, PromisifiedModule } from "../interfaces"
import { createPrimOptions } from "../options"
import { isDefined } from "emery"
import { createMethodCatcher } from "./proxy"
import getProperty from "just-safe-get"

export function createPrimClient<
	ModuleType extends PrimOptions["module"] = object,
	JsonHandlerType extends PrimOptions["jsonHandler"] = JsonHandler,
>(options?: PrimOptions<ModuleType, JsonHandlerType>) {
	options = createPrimOptions<PrimOptions<ModuleType, JsonHandlerType>>(options)
	// const providedModule = unwrapModule(options.module)
	const providedMethodPlugin = isDefined(options.methodPlugin)
	const providedCallbackPlugin = isDefined(options.callbackPlugin)
	return createMethodCatcher<PromisifiedModule<ModuleType>>({
		onMethod(rpc, next) {
			// if first method in a chain is provided, resolve locally (promise optional)
			const method = getProperty(options.module ?? {}, rpc.method) as undefined | ((...args: unknown[]) => unknown)
			if (method) return method(...rpc.args)
			return next
		},
		onAwaited(rpcRaw, next) {
			console.log(rpcRaw)
			throw "not implemented yet"
		},
	})
}

const a = createPrimClient({
	jsonHandler: {
		parse: () => {},
		stringify: () => {},
	},
	// eslint-disable-next-line @typescript-eslint/require-await
	async methodPlugin(a, b, c, d) {
		return { result: {} }
	},
	module: {
		lol: () => {},
		what: () => {},
	},
	allowList: {
		what: "idempotent",
		lol: true,
	},
})

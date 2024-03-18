/* eslint-disable @typescript-eslint/no-unused-vars */
import { DeepProxy } from "proxy-deep"
import type { JsonHandler, PrimOptions, PromisifiedModule } from "../interfaces"
import { createPrimOptions } from "../options"
import { isDefined } from "emery"

function primClient() {}

export function createPrimClient<
	ModuleType extends PrimOptions["module"] = object,
	JsonHandlerType extends PrimOptions["jsonHandler"] = JsonHandler,
>(options?: PrimOptions<ModuleType, JsonHandlerType>): PromisifiedModule<ModuleType> {
	options = createPrimOptions<PrimOptions<ModuleType, JsonHandlerType>>(options)
	// const providedModule = unwrapModule(options.module)
	const providedMethodPlugin = isDefined(options.methodPlugin)
	const providedCallbackPlugin = isDefined(options.callbackPlugin)
	return new DeepProxy(options.module ?? {}, {
		apply(_target, _thisArg, _argArray) {},
		get(_target, _p, _receiver) {
			this.nest(() => undefined)
		},
	}) as PromisifiedModule<ModuleType>
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

import { isPromise } from "es-toolkit";
import {
	CallCatcher,
	type CallCondition,
	CaughtCallType,
	type CaughtStack,
	CaughtType,
} from "./call-catcher";
import { createRpcId, type RpcFunctionCall } from "./types/rpc-structure";
import { UnknownAsync } from "./unknown-async";
import { isIterator } from "./utils/is-iterable";

/**
 * Capture all function calls on an object and record them as RPCs. Captured
 * options can include direct function calls, method calls on objects, chained
 * methods, and curried functions.
 *
 * The intent of the class is to capture access on the object's proxy as RPC,
 * in a format that could be eventually serialized. This class only handles
 * method calls, and does not serialize arguments or deserialize returned
 * values. This should instead be handled by a separate class that's expected
 * to serialize these values into RPC events.
 *
 * All handled function calls will be returned back to the caller as an async
 * value, either as a promise or an async iterator because it's expected that
 * the returned value is remote and will not immediately be available.
 */
export class RpcGenerator<T> extends CallCatcher<T> {
	#handler: MethodCallHandler;

	#convertStackToRpc(stack: CaughtStack): RpcFunctionCall[] {
		return stack // NOTE: at this point, all properties should've become calls
			.map((caught) => {
				if (caught.type !== CaughtType.Call) return null;
				return {
					id: createRpcId(caught.id),
					method: caught.path.map((part) => part.toString()),
					new: caught.callMethod === CaughtCallType.Constructor,
					args: caught.args,
					chain: caught.chain ? createRpcId(caught.chain) : null,
				};
			})
			.filter((given) => given !== null);
	}

	/**
	 * When a chain of RPCs are created (for example `proxy.lorem().ipsum()`),
	 * each call has a unique ID. However, if we assign `const a = proxy.lorem()`,
	 * call `a.ipsum()`, and then call `a.dolor()`, both `ipsum` and `dolor` are
	 * part of the same chain and without this setting, would share the same root
	 * ID. While this may not be an issue for this class, it could be an issue for
	 * a class that extends or otherwise utilizes this class instance (especially
	 * if an RPC is already sent and the resulting reference is lost, meaning the
	 * root ID originally intended can't be utilized).
	 *
	 * With this option enabled, each RPC created from the root will still receive
	 * new IDs (as they did previously) but RPCs created from a previous chain
	 * that diverge will have new IDs generated from their previous IDs, instead
	 * of sharing the same ID. This will allow a unique ID to be generated for
	 * each chain while still being able to understand the original intention
	 * (for example, we know that the function was called from a previous chain
	 * and not the root, which could be useful).
	 */
	// todo: implement this logic
	// #generateNewIdsOnChainSplit = false;

	constructor(handler: MethodCallHandler) {
		const callCondition: CallCondition = (next, stack) => {
			const caught = stack.at(-1);
			if (!caught) return next;
			const funcCall = caught.type === CaughtType.Call;
			const asyncMethod = UnknownAsync.determineCaughtType(caught);
			const isModuleCall = funcCall && !asyncMethod;
			if (!isModuleCall) return next;

			const unknownAsync = new UnknownAsync();
			// note: UnknownAsync and RpcGenerator use the same callback and must use
			// the same root CallCatcher instance to continue generating unique IDs
			unknownAsync.setInitialStack(stack, false, this);
			unknownAsync.fallbackSet(callCondition);

			const runHandler = async (stack: CaughtStack) => {
				try {
					const skip = Symbol();
					const rpc = this.#convertStackToRpc(stack);
					const value = await this.#handler(rpc, skip);
					if (skip === value) {
						return unknownAsync.giveNothing();
					} else if (isPromise(value)) {
						unknownAsync.givePromise(value);
					} else if (isIterator(value)) {
						unknownAsync.giveIterator(value);
					} else {
						unknownAsync.givePromise(value);
					}
				} catch (error) {
					unknownAsync.givePromise(Promise.reject(error));
				}
			};
			void runHandler(stack);
			return unknownAsync.proxy;
		};
		super(callCondition, {
			callFunction: true,
			callConstructor: true,
			propAccess: true,
		});
		this.#handler = handler;
	}
}

export type MethodCallHandler = (
	stack: RpcFunctionCall[],
	skip: symbol,
	// biome-ignore lint/suspicious/noExplicitAny: value could be anything
) => any;

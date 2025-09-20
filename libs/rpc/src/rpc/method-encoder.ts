import { isPromise } from "es-toolkit";
import {
	CallCatcher,
	type CallCondition,
	type CaughtStack,
	CaughtType,
} from "../call-catcher";
import { UnknownAsync } from "../unknown-async";
import { isIterator } from "../utils/is-iterable";
import { createRpcId, type RpcFunctionCall } from "./types-message";

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
 */
export class RpcMethodEncoder<T> extends CallCatcher<T> {
	#handler: MethodCallHandler;

	#convertStackToRpc(stack: CaughtStack): RpcFunctionCall[] {
		return stack // NOTE: at this point, all properties should've become calls
			.map((caught) => {
				if (caught.type !== CaughtType.Call) return null;
				return {
					id: createRpcId(caught.id),
					method: caught.path.map((part) => part.toString()),
					args: caught.args,
					chain: caught.chain ? createRpcId(caught.chain) : null,
				};
			})
			.filter((given) => given !== null);
	}

	constructor(handler: MethodCallHandler) {
		const callCondition: CallCondition = (next, stack) => {
			const caught = stack.at(-1);
			const funcCall = caught.type === CaughtType.Call;
			const asyncMethod = UnknownAsync.determineCaughtType(caught);
			const isModuleCall = funcCall && !asyncMethod;
			if (!isModuleCall) return next;

			const unknownAsync = new UnknownAsync();
			unknownAsync.setInitialStack(stack);
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
			callConstructor: true, // TODO: consider whether calls should be supported and how that affects RPC messages
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

import { castToOpaque, type Opaque } from "emery";
import { isPromise } from "es-toolkit";
import {
	CallCatcher,
	type CallCondition,
	type CaughtStack,
	CaughtType,
} from "./call-catcher";
import { UnknownAsync } from "./unknown-async";
import { isIterator } from "./utils/is-iterable";

/**
 * Capture all function calls on an object and record them as RPCs. Captured
 * options can include direct function calls, method calls on objects, chained
 * methods, and curried functions.
 *
 * The intent of the class is to capture access on the object's proxy as RPC,
 * in a format that could be serialized. While this class will provide a handler
 * to return a result to the callee, serialization and transport are not
 * responsibilities of this class.
 */
export class RpcGenerator<T> extends CallCatcher<T> {
	#handler: MethodCallHandler;

	// #convertStackToRpc(stack: CaughtStack): RpcStack {}

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
					const value = await this.#handler(stack, skip);
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
			propAccess: true,
		});
		this.#handler = handler;
	}
}

type MethodCallHandler = (
	stack: CaughtStack,
	skip: symbol,
	// biome-ignore lint/suspicious/noExplicitAny: value could be anything
) => any;

const RpcIdSymbol: unique symbol = Symbol();
export type RpcId = Opaque<number, typeof RpcIdSymbol>;
export function createRpcId(id: number): RpcId {
	return castToOpaque<RpcId>(id);
}

type SerializablePropertyKey = Exclude<PropertyKey, symbol>;
export type RpcBase = {
	id: RpcId;
	chain?: RpcId;
};

export type Rpc<Args extends unknown[] = unknown[]> = RpcBase & {
	method: SerializablePropertyKey[];
	args: Args;
};

export type RpcStack = Rpc[];

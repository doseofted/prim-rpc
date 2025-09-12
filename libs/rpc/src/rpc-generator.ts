import { castToOpaque, type Opaque } from "emery";
import {
	CallCatcher,
	type CallCondition,
	type CaughtStack,
	CaughtType,
} from "./call-catcher";
import { UnknownAsync } from "./unknown-async";

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
	#handler: Handler;

	// #convertStackToRpc(stack: CaughtStack): RpcStack {}

	constructor(handler: Handler) {
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
				const result = await this.#handler(stack);
				switch (result.type) {
					case ReturnedType.Promise:
						return unknownAsync.givePromise(result.value);
					case ReturnedType.Iterator:
						return unknownAsync.giveIterator(result.value);
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

export enum ReturnedType {
	Promise = 1,
	Iterator,
}
type HandlerResult =
	// biome-ignore lint/suspicious/noExplicitAny: Promise could be anything
	| { type: ReturnedType.Promise; value: any | Promise<any> }
	// biome-ignore lint/suspicious/noExplicitAny: Iterator could be anything
	| { type: ReturnedType.Iterator; value: AsyncIterable<any> };
type Handler = (stack: CaughtStack) => HandlerResult | Promise<HandlerResult>;

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

import { CallCatcher, type CallCondition, CaughtType } from "./call-catcher";
import { UnknownAsync } from "./unknown-async";

export class RpcClient<T> extends CallCatcher<T> {
	// this will become private in the future
	#pendingRpcCalls = [];

	constructor() {
		const callCondition: CallCondition = (next, stack) => {
			const caught = stack.at(-1);
			const funcCall = caught.type === CaughtType.Call;
			const asyncMethod = UnknownAsync.determineCaughtType(caught);
			const isModuleCall = funcCall && !asyncMethod;
			if (!isModuleCall) return next;

			this.#pendingRpcCalls.push(stack);

			const unknownAsync = new UnknownAsync();
			unknownAsync.setInitialStack(stack);
			unknownAsync.fallbackSet(callCondition);
			const lastPath = caught.path.at(-1);
			if (lastPath === "promised") {
				unknownAsync.givePromise(stack);
			} else if (lastPath === "iterated") {
				function* generator() {
					for (const item of stack) yield item;
				}
				unknownAsync.giveIterator(generator());
			}
			return unknownAsync.proxy;
		};
		super(callCondition, {
			callFunction: true,
			propAccess: true,
		});
	}
}

export function createRpcClient<T>(): T {
	return new RpcClient<T>().proxy;
}

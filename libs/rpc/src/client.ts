import { CallCatcher, type CallCondition, CaughtType } from "./call-catcher";
import { UnknownAsync } from "./unknown-async";

export class RpcClient<T> {
	#catchCondition: CallCondition = (next, stack) => {
		const caught = stack.at(-1);
		const funcCall = caught.type === CaughtType.Call;
		const asyncMethod = UnknownAsync.determineCaughtType(caught);
		console.log(asyncMethod);
		if (funcCall && !asyncMethod) {
			// console.log(caught.path.join("."));
			const unknownAsync = new UnknownAsync();
			unknownAsync.fallbackSet(this.#catchCondition);
			if (caught.path.at(-1) === "promised") {
				unknownAsync.givePromise(stack);
			} else if (caught.path.at(-1) === "iterated") {
				function* generator() {
					for (const item of stack) {
						yield item;
					}
				}
				unknownAsync.giveIterator(generator());
			}
			unknownAsync.setInitialStack(stack);
			return unknownAsync.proxy;
		}
		return next;
	};
	#catcher = new CallCatcher<T>(this.#catchCondition, {
		callFunction: true,
		propAccess: true,
	});
	proxy = this.#catcher.proxy;
}

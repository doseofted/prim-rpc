import { CallCatcher, type CallCondition, CaughtType } from "./call-catcher";
import { UnknownAsync, UnknownAsyncType } from "./unknown-async";

export class RpcClient<T> {
	#catchCondition: CallCondition = (next, stack) => {
		const caught = stack.at(-1);
		// if (!possibleFunc) return next;
		// const caughtMaybeResolve = stack.at(-1);
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

	// #trackedStack;
	// #pendingRpc: UnknownAsync[] = [];
	// #callCondition: CallCondition = (next, stack) => {
	// 	const caught = stack.at(-1);
	// 	const methodCall = caught?.type === CaughtType.Call;
	// 	const unknownReturn = new UnknownAsync();
	// 	setTimeout(() => {
	// 		unknownReturn.givePromise(Promise.resolve(42));
	// 	}, 0);
	// 	unknownReturn.fallbackSet((next, stack) => {
	// 		console.log("promise interaction", stack.at(-1));
	// 		return this.#callCondition(next, stack);
	// 	});
	// 	this.#pendingRpc.push(unknownReturn);
	// 	console.log(caught.path);
	// 	if (caught.path.includes("then")) {
	// 		console.log("help");
	// 		return unknownReturn.proxy;
	// 	}
	// 	console.log("returning next");
	// 	return next;
	// 	// return methodCall ? unknownReturn.proxy : next;
	// };
	// #callCatcher = new CallCatcher<T>(this.#callCondition);
	// proxy = this.#callCatcher.proxy as T;
}

// type EvaluatorCondition = (
// 	next: symbol,
// 	stack: CaughtStack,
// 	parent?: unknown,
// ) => unknown;
// class ProxyOfProxies extends CallCatcher {
// 	#evaluator: EvaluatorCondition;
// 	constructor(evaluator: EvaluatorCondition) {
// 		super((next, stack) => {
// 			const given = this.#evaluator(next, stack, this.#parentProxy);
// 			if (given !== next) {
// 				this.#setParentProxy(given);
// 			}
// 			return next;
// 		}, true);
// 		this.#evaluator = evaluator;
// 	}

// 	#parentProxy?: unknown;
// 	#setParentProxy(parent: unknown) {
// 		this.#parentProxy = parent;
// 	}
// }

// new ProxyOfProxies((next, stack, parent) => {
// 	const caught = stack.at(-1);
// 	if (UnknownAsync.asyncTypeSupported(caught)) {
// 		const unknownAsync = new UnknownAsync();
// 		return unknownAsync.proxy;
// 	}
// 	return next;
// });

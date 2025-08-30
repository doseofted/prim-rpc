import { CallCatcher } from "./call-catcher";

// TODO: instead of this class, consider just using CallCatcher and falling back to to another proxy if condition is unmet

/**
 * Catch various actions on an object and direct each action to its designated
 * proxy based on a list of defined conditions.
 */
export class ProxyOfProxies<
	T,
	const P extends string,
	A extends { [K in P]: T },
> {
	// ...
	constructor(proxies: A, chooseProxy: () => P) {}

	proxy = new CallCatcher((next, stack) => {
		stack.at(0);
	});
}

new ProxyOfProxies(
	{
		test: 1,
		lorem: 2,
	},
	() => {
		return "lorem";
	},
);

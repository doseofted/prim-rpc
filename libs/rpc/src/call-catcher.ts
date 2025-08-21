import { DeepProxy } from "proxy-deep";

/**
 * Recursively records all method calls and properties accessed on an object
 * until an end condition is met, after which the recorded properties and
 * methods will be returned, after being processed by the user's defined
 * callback for processing the returned value.
 */
export class CallCatcher<ObjectShape> {
	#proxy = new DeepProxy(() => null, {
		get(target, prop, receiver) {
			// Record the property access
			return Reflect.get(target, prop, receiver);
		},
		apply(target, thisArg, argumentsList) {
			// Record the method call
			return Reflect.apply(target, thisArg, argumentsList);
		},
	}) as ObjectShape;

	constructor() {
		// ...
	}
}

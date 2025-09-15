import { isFunction, isPromise } from "es-toolkit";
import { isIterator } from "../utils/is-iterable";
import { EventfulValue } from "./eventful-value";

export class EventfulPromise extends EventfulValue {
	constructor() {
		super("p", isPromise);
	}
}

export class EventfulIterator extends EventfulValue {
	constructor() {
		super("i", isIterator);
	}
}

export class EventfulFunction extends EventfulValue {
	constructor() {
		super("f", isFunction);
	}
}

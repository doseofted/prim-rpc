import { isFunction, isPromise } from "es-toolkit";
import { EventfulValue } from "./eventful-value";
import { isIterable } from "./utilities";

export class EventfulPromise extends EventfulValue {
	constructor() {
		super("p", isPromise);
	}
}

export class EventfulIterator extends EventfulValue {
	constructor() {
		super("i", isIterable);
	}
}

export class EventfulFunction extends EventfulValue {
	constructor() {
		super("f", isFunction);
	}
}

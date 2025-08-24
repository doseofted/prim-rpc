import type { SetOptional } from "type-fest";
import {
	type Caught,
	type CaughtCall,
	type CaughtId,
	type CaughtNew,
	type CaughtStack,
	CaughtType,
	createCaughtId,
} from "./call-catcher-structure";

// TODO: (1) consider creating more generic recursive proxy that tracks access to object
//           - allow tracked items to be filtered
// TODO: if (1) is considered, make CallCatcher build an RPC-like structure from it
// TODO: consider creating "proxy of proxies" object to determine which proxy to use
//       (such as CallCatcher or UnknownAsync)

// type ObjectTree =
// 	| Extract<CaughtType, CaughtType.Call | CaughtType.New>
// 	| {
// 			[key: PropertyKey]: ObjectTree;
// 	  };

// type CallCatcherInstances = Record<PropertyKey, CallCatcher>;

type CallCondition = (next: symbol, stack: CaughtStack) => unknown;
/**
 * Recursively records all method calls and properties accessed on an object
 * until an end condition is met, after which the recorded properties and
 * methods will be returned, after being processed by the user's defined
 * callback for processing the returned value.
 */
// biome-ignore lint/suspicious/noExplicitAny: Provided type could be any object
export class CallCatcher<ObjectShape = any> {
	#lastId: CaughtId = createCaughtId(0);
	#createUniqueId(): CaughtId {
		const root = this.#rootParent ?? this;
		if (this === root) {
			return createCaughtId(this.#lastId++);
		} else {
			return root.#createUniqueId();
		}
	}

	#stack: CaughtStack = [];
	#callCondition: CallCondition;

	/** Avoid creating new nested proxies, if already created */
	// #instances: CallCatcherInstances = {};

	/** The instance that created the class */
	// #directParent: CallCatcher | null = null;
	/** The top-level instance that created the class */
	#rootParent: CallCatcher | null = null;

	#createChild(pendingStack: CaughtStack): CallCatcher {
		const child = new CallCatcher(this.#callCondition);
		child.#rootParent = this.#rootParent ?? this;
		// child.#directParent = this;
		child.#stack = pendingStack;
		return child;
	}

	#utilities = {
		caughtTypeIsCallable(
			given?: Omit<Caught, "id">,
		): given is CaughtCall | CaughtNew {
			return given && [CaughtType.Call, CaughtType.New].includes(given.type);
		},
	};

	#updateStack(stack: CaughtStack, replaceStack = false): CaughtStack {
		if (replaceStack) this.#stack = stack;
		return stack;
	}

	#appendToStack(
		newItem: SetOptional<Caught, "id">,
		updateStack = false,
	): CaughtStack {
		const stack = this.#stack.concat();
		const lastItem = stack.pop();
		const lastType = lastItem?.type;
		const newType = newItem.type;
		const itemsAreSameType = lastType === newItem.type;
		if (newType === CaughtType.Prop && itemsAreSameType) {
			lastItem.path.push(...newItem.path);
			stack.push({ ...lastItem, id: this.#createUniqueId() });
			return this.#updateStack(stack, updateStack);
		}
		const newItemIsCallable = this.#utilities.caughtTypeIsCallable(newItem);
		if (lastType === CaughtType.Prop && newItemIsCallable) {
			const path = [...lastItem.path, ...newItem.path];
			stack.push({
				...newItem,
				path,
				id: this.#createUniqueId(),
			});
			return this.#updateStack(stack, updateStack);
		}
		if (lastItem) stack.push(lastItem);
		const lastItemIsCallable = this.#utilities.caughtTypeIsCallable(lastItem);
		const newItemWithId = {
			...newItem,
			id: this.#createUniqueId(),
		};
		if (lastItemIsCallable) {
			stack.push({
				...newItemWithId,
				chain: lastItem.id,
			});
			return this.#updateStack(stack, updateStack);
		}
		stack.push(newItemWithId);
		return this.#updateStack(stack, updateStack);
	}

	proxy = new Proxy(CallCatcher, {
		get: (_target, property, _receiver) => {
			const pendingStack = this.#appendToStack({
				type: CaughtType.Prop,
				path: [property],
			});
			const next = Symbol();
			const condition = this.#callCondition(next, pendingStack);
			if (condition !== next) return condition;
			const instance = this.#createChild(pendingStack);
			return instance.proxy;
		},
		apply: (_target, _thisArg, args) => {
			const pendingStack = this.#appendToStack({
				type: CaughtType.Call,
				path: [],
				args,
			});
			const next = Symbol();
			const condition = this.#callCondition(next, pendingStack);
			if (condition !== next) return condition;
			const instance = this.#createChild(pendingStack);
			return instance.proxy;
		},
		construct: (_target, args, _newTarget) => {
			const pendingStack = this.#appendToStack({
				type: CaughtType.Call,
				path: [],
				args,
			});
			const next = Symbol();
			const condition = this.#callCondition(next, pendingStack);
			if (condition !== next) return condition;
			const instance = this.#createChild(pendingStack);
			return instance.proxy;
		},
	}) as ObjectShape;

	// proxy = new Proxy(this, {
	// 	get(target, prop, receiver) {
	// 		const id = createCaughtId(this.rootTarget.#lastId++);
	// 		const value = this.rootTarget.#callCondition(
	// 			this.rootTarget.#next,
	// 			this.rootTarget.#stack,
	// 		);
	// 		const keepProxying = this.rootTarget.#next === value;
	// 		if (keepProxying) {
	// 			this.rootTarget.#stack.push({
	// 				id,
	// 				type: CaughtType.Prop,
	// 				path: this.path.concat(prop),
	// 			});
	// 			return this.nest(() => null);
	// 		} else {
	// 			return value;
	// 		}
	// 		// return Reflect.get(target, prop, receiver);
	// 	},
	// 	apply(target, thisArg, argumentsList) {
	// 		return Reflect.apply(target, thisArg, argumentsList);
	// 	},
	// }) as unknown as ObjectShape;

	constructor(callCondition: CallCondition) {
		this.#callCondition = callCondition;
	}
}

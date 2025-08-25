import { castToOpaque, type Opaque } from "emery";
import type { SetOptional } from "type-fest";

// TODO: consider creating "proxy of proxies" object to determine which proxy to use
//       (such as CallCatcher or UnknownAsync)

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
		const itemInStackIsCallable = stack
			.concat(lastItem)
			.reverse()
			.find(this.#utilities.caughtTypeIsCallable);
		const chain = itemInStackIsCallable ? itemInStackIsCallable.id : undefined;
		if (lastType === CaughtType.Prop && newItemIsCallable) {
			const path = [...lastItem.path, ...newItem.path];
			stack.push({
				...newItem,
				path,
				chain,
				id: this.#createUniqueId(),
			});
			return this.#updateStack(stack, updateStack);
		}
		if (lastItem) stack.push(lastItem);
		const newItemWithId = {
			...newItem,
			id: this.#createUniqueId(),
		};
		if (itemInStackIsCallable) {
			stack.push({
				...newItemWithId,
				chain,
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
				type: CaughtType.New,
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

	constructor(callCondition: CallCondition) {
		this.#callCondition = callCondition;
	}
}

const CaughtIdSymbol: unique symbol = Symbol();
export type CaughtId = Opaque<number, typeof CaughtIdSymbol>;
export function createCaughtId(id: number) {
	return castToOpaque<CaughtId>(id);
}

export type CallCondition = (next: symbol, stack: CaughtStack) => unknown;

export enum CaughtType {
	/** Property access */
	Prop = 1,
	/** Method calls */
	Call,
	/** Constructor calls */
	New,
}

export type CaughtBase = {
	id: CaughtId;
	path: PropertyKey[];
	type: CaughtType;
	chain?: CaughtId;
};

export type CaughtCall<Args extends unknown[] = unknown[]> = CaughtBase & {
	type: CaughtType.Call;
	args: Args;
};

export type CaughtProp = CaughtBase & {
	type: CaughtType.Prop;
};

export type CaughtNew<Args extends unknown[] = unknown[]> = CaughtBase & {
	type: CaughtType.New;
	args: Args;
};

export type Caught = CaughtCall | CaughtProp | CaughtNew;

export type CaughtStack = Caught[];

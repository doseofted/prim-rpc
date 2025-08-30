import { castToOpaque, type Opaque } from "emery";
import type { SetOptional } from "type-fest";

/**
 * Recursively records all method calls and properties accessed on an object
 * until an end condition is met, after which the recorded properties and
 * methods will be returned, after being processed by the user's defined
 * callback for processing the returned value.
 */
// biome-ignore lint/suspicious/noExplicitAny: Provided type could be any object
export class CallCatcher<ObjectShape = any> {
	constructor(callCondition: CallCondition, catchOptions: CatchOptions = true) {
		this.#callCondition = callCondition;
		this.#shouldCatch = this.#expandOptions(catchOptions);
	}

	#expandOptions(options: CatchOptions): CatchOptionsGranular {
		if (typeof options === "boolean") {
			return {
				callFunction: options,
				callConstructor: options,
				propAccess: options,
				propAssignment: options,
				propDeletion: options,
			};
		}
		return options;
	}

	#shouldCatch: CatchOptionsGranular;
	changeCaught(options: CatchOptions) {
		const expandedOptions = this.#expandOptions(options);
		Object.entries(expandedOptions).forEach(([key, value]) => {
			this.#shouldCatch[key] = value ?? this.#shouldCatch[key];
		});
	}

	#lastId: CaughtId = createCaughtId(0);
	#createUniqueId(): CaughtId {
		const root = this.#rootParent ?? this;
		if (this === root) {
			return createCaughtId(this.#lastId++);
		} else {
			return root.#createUniqueId();
		}
	}

	/**
	 * A history of access, calls, and modifications on an object or resulting
	 * object from a call
	 */
	#stack: CaughtStack = [];
	#callCondition: CallCondition;

	/** The top-level instance that created the class */
	#rootParent: CallCatcher | null = null;

	#createChild(pendingStack: CaughtStack): CallCatcher {
		const child = new CallCatcher(this.#callCondition);
		child.#rootParent = this.#rootParent ?? this;
		child.#stack = pendingStack;
		return child;
	}

	#updateStack(stack: CaughtStack, replaceStack = false): CaughtStack {
		if (replaceStack) this.#stack = stack;
		return stack;
	}

	#appendToStack(
		newItem: SetOptional<Caught, "id">,
		updateStack = false,
	): CaughtStack {
		const stack = this.#stack.concat();
		const itemInStackIsCallable = stack.findLast(
			(item) => item.type === CaughtType.Call,
		);
		const chain = itemInStackIsCallable ? itemInStackIsCallable.id : undefined;
		const lastItem = stack.pop();
		const lastType = lastItem?.type;
		const newType = newItem.type;
		const bothItemsAreProps =
			newType === CaughtType.Prop && newType === lastType;
		const lastPropertyWasModified =
			bothItemsAreProps && lastItem.interaction !== CaughtPropType.Access;
		if (lastPropertyWasModified) {
			stack.push(lastItem);
			const path = bothItemsAreProps
				? lastItem.path
				: [...lastItem.path, ...newItem.path];
			stack.push({ ...newItem, path, chain, id: this.#createUniqueId() });
			return this.#updateStack(stack, updateStack);
		} else if (bothItemsAreProps) {
			const path = lastItem.path.concat(...newItem.path);
			stack.push({ ...newItem, path, chain, id: this.#createUniqueId() });
			return this.#updateStack(stack, updateStack);
		}
		const newItemIsCallable = newItem.type === CaughtType.Call;
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
			chain,
			id: this.#createUniqueId(),
		};
		stack.push(newItemWithId);
		return this.#updateStack(stack, updateStack);
	}

	#determineNext(pendingStack: CaughtStack) {
		const next = Symbol();
		const condition = this.#callCondition(next, pendingStack);
		if (condition !== next) return condition;
		const lastItem = pendingStack.at(-1);
		const lastItemIsPropModification =
			lastItem.type === CaughtType.Prop &&
			lastItem.interaction !== CaughtPropType.Access;
		// Proxy set/deleteProperty returns boolean (assume true if not provided)
		if (lastItemIsPropModification) {
			this.#stack = pendingStack;
			return true;
		}
		const instance = this.#createChild(pendingStack);
		return instance.proxy;
	}

	proxy = new Proxy(CallCatcher, {
		get: (_target, property, _receiver) => {
			if (!this.#shouldCatch.propAccess) return;
			const pendingStack = this.#appendToStack({
				type: CaughtType.Prop,
				path: [property],
				interaction: CaughtPropType.Access,
			});
			return this.#determineNext(pendingStack);
		},
		set: (_target, property, newValue, _receiver) => {
			if (!this.#shouldCatch.propAssignment) return;
			const pendingStack = this.#appendToStack({
				type: CaughtType.Prop,
				path: [property],
				interaction: CaughtPropType.Assignment,
				value: newValue,
			});
			return this.#determineNext(pendingStack);
		},
		deleteProperty: (_target, property) => {
			if (!this.#shouldCatch.propDeletion) return;
			const pendingStack = this.#appendToStack({
				type: CaughtType.Prop,
				path: [property],
				interaction: CaughtPropType.Deletion,
			});
			return this.#determineNext(pendingStack);
		},
		apply: (_target, _thisArg, args) => {
			if (!this.#shouldCatch.callFunction)
				throw new TypeError("Target is not a function");
			const pendingStack = this.#appendToStack({
				type: CaughtType.Call,
				path: [],
				args,
				constructed: false,
			});
			return this.#determineNext(pendingStack);
		},
		construct: (_target, args, _newTarget) => {
			if (!this.#shouldCatch.callConstructor)
				throw new TypeError("Target is not a constructor");
			const pendingStack = this.#appendToStack({
				type: CaughtType.Call,
				path: [],
				args,
				constructed: true,
			});
			return this.#determineNext(pendingStack);
		},
	}) as ObjectShape;
}

const CaughtIdSymbol: unique symbol = Symbol();
export type CaughtId = Opaque<number, typeof CaughtIdSymbol>;
export function createCaughtId(id: number) {
	return castToOpaque<CaughtId>(id);
}

export type CatchOptionsGranular = {
	callFunction?: boolean;
	callConstructor?: boolean;
	propAccess?: boolean;
	propAssignment?: boolean;
	propDeletion?: boolean;
};
export type CatchOptions = boolean | CatchOptionsGranular;

export type CallCondition = (next: symbol, stack: CaughtStack) => unknown;

export enum CaughtType {
	/** Property access */
	Prop = 1,
	/** Method calls */
	Call,
}

export type CaughtBase = {
	id: CaughtId;
	path: PropertyKey[];
	type: CaughtType;
	chain?: CaughtId;
};

export enum CaughtCallType {
	/** Function calls */
	Function = 1,
	/** Constructor calls */
	Constructor,
}
export type CaughtCall<Args extends unknown[] = unknown[]> = CaughtBase & {
	type: CaughtType.Call;
	args: Args;
	constructed: boolean;
};

export enum CaughtPropType {
	/** Property access */
	Access = 1,
	/** Property assignment */
	Assignment,
	/** Property deletion */
	Deletion,
}
export type CaughtProp<Value = unknown> = CaughtBase & {
	type: CaughtType.Prop;
	interaction: CaughtPropType;
	value?: Value;
};

export type Caught = CaughtCall | CaughtProp;

export type CaughtStack = Caught[];

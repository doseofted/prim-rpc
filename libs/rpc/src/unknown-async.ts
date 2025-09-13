import { isPromise, isUndefined } from "es-toolkit";
import {
	CallCatcher,
	type CallCondition,
	type CatchOptionsGranular,
	type Caught,
	CaughtCallType,
	CaughtPropType,
	CaughtType,
} from "./call-catcher";
import { isIterable } from "./utils/is-iterable";

/**
 * Returns a proxy object with methods of both a promise and an async iterable,
 * so that once it's decided whether the object is a promise or an iterable, all
 * future calls to that object should be made with the expected type.
 *
 * All iterables given will become async iterables otherwise all values given
 * will be wrapped as a promise.
 *
 * The purpose of having an object that may become either a promise or an
 * async iterable is so that we can immediately call methods of specific objects
 * without actually having to await an object. This class once initialized may
 * be wrapped in TypeScript types to reflect the intended return value.
 */
export class UnknownAsync<T = UnknownAsyncProxy> extends CallCatcher<T> {
	#handle?: HandleUnknownOptionsGranular;
	#defaultCatchOptions: CatchOptionsGranular;

	constructor(handle: HandleUnknownOptions = true) {
		const defaultCatchOptions: CatchOptionsGranular = {
			callFunction: true,
			propAccess: true,
		};
		const handler: CallCondition = (next, stack) => {
			const caught = stack.at(-1);
			const intendedForFallback =
				!UnknownAsync.#shouldCaughtBeProcessed(caught);
			const methodName = caught.path.at(-1);
			const noMethodName = isUndefined(methodName);
			const includesMethodName = UnknownAsync.#methods.includes(methodName);
			const anonymousMethod = noMethodName && caught.type === CaughtType.Call;
			if (anonymousMethod) return next;
			const unsupportedMethod = !noMethodName && !includesMethodName;
			if (unsupportedMethod || intendedForFallback)
				return this.#fallbackCondition?.(next, stack);
			if (caught.type !== CaughtType.Call) return next;
			const includesPromiseMethod =
				UnknownAsync.#methodsPromise.includes(methodName);
			const notGivenPromiseType = this.#givenType !== UnknownAsyncType.Promise;
			if (includesPromiseMethod && notGivenPromiseType) {
				this.#notPreparedMethodCalls[UnknownAsyncType.Promise] = true;
			}
			const handlePromises = this.#handle.promises;
			if (includesPromiseMethod && !handlePromises) {
				this.#rejectFuturePromises(true);
			}
			if (includesPromiseMethod) {
				return this.#promise[methodName].apply(this.#promise, caught.args);
			}
			const includesIteratorMethod =
				UnknownAsync.#methodsIterator.includes(methodName);
			const notGivenIteratorType =
				this.#givenType !== UnknownAsyncType.Iterator;
			if (includesIteratorMethod && notGivenIteratorType) {
				this.#notPreparedMethodCalls[UnknownAsyncType.Iterator] = true;
			}
			const handleIterators = this.#handle.iterators;
			if (includesIteratorMethod && !handleIterators) {
				this.#rejectFutureIterators(true);
			}
			if (includesIteratorMethod) {
				return this.#iterator[methodName].apply(this.#iterator, caught.args);
			}
			return next; // this should be unreachable
		};
		super(handler, defaultCatchOptions);
		this.#defaultCatchOptions = defaultCatchOptions;
		this.#handle = this.#expandHandled(handle);
	}

	#expandHandled(options: HandleUnknownOptions): HandleUnknownOptionsGranular {
		if (typeof options === "boolean") {
			return {
				iterators: options,
				promises: options,
			};
		}
		return options;
	}

	#expandOptions(
		options: CatchOptionsUnknownAsync,
	): CatchOptionsUnknownAsyncGranular {
		if (typeof options !== "boolean") return options;
		return {
			callConstructor: options,
			propAssignment: options,
			propDeletion: options,
		};
	}

	changeCaught(options: CatchOptionsUnknownAsync): void {
		const optionsGranular = this.#expandOptions(options);
		const superOptions: CatchOptionsGranular = {
			...optionsGranular,
			...this.#defaultCatchOptions,
		};
		super.changeCaught(superOptions);
	}

	#fallbackCondition?: CallCondition;
	/**
	 * When a method or property is accessed that doesn't exist, optionally
	 * provide a fallback handler for the properties accessed.
	 *
	 * By default, all property access will be recorded once a fallback is set.
	 * This can be changed by providing specific catch options.
	 */
	fallbackSet(
		condition: CallCondition,
		catchOptions: CatchOptionsUnknownAsync = true,
	): void {
		this.#fallbackCondition = condition;
		this.changeCaught(catchOptions);
	}

	/**
	 * If a fallback is provided with `.setFallback()`, it can be removed.
	 *
	 * By default, the catch options will revert to original defaults once there
	 * is no need to capture additional access (since the fallback is removed).
	 */
	fallbackRemove(revertCatchOptions = true): void {
		this.#fallbackCondition = undefined;
		if (revertCatchOptions) {
			this.changeCaught(this.#defaultCatchOptions);
		}
	}

	/** Original promise or iterable given */
	#given?: unknown;

	static #methodsPromise: PropertyKey[] = ["then", "catch", "finally"];
	static #methodsIterator: PropertyKey[] = [
		"next",
		"return",
		"throw",
		Symbol.iterator,
		Symbol.asyncIterator,
	];
	/** Methods not to expose from proxy */
	static #hiddenMethods: PropertyKey[] = [Symbol.iterator];
	/** Methods of either a promise or async iterable */
	static get #methods(): PropertyKey[] {
		return [
			...UnknownAsync.#methodsPromise,
			...UnknownAsync.#methodsIterator,
		].filter((method) => !UnknownAsync.#hiddenMethods.includes(method));
	}

	#notPreparedMethodCalls: Record<
		UnknownAsyncType.Promise | UnknownAsyncType.Iterator,
		boolean
	> = {
		[UnknownAsyncType.Promise]: false,
		[UnknownAsyncType.Iterator]: false,
	};

	static #shouldCaughtBeProcessed(caught: Caught) {
		const isCall = caught.type === CaughtType.Call;
		const isCallFunc = isCall && caught.callMethod === CaughtCallType.Function;
		const isProp = caught.type === CaughtType.Prop;
		const isPropAccess = isProp && caught.interaction === CaughtPropType.Access;
		return (isCallFunc && CaughtType.Call) || (isPropAccess && CaughtType.Prop);
	}

	static determineCaughtType(caught: Caught): UnknownAsyncType {
		const isSupportedType = UnknownAsync.#shouldCaughtBeProcessed(caught);
		const lastPath = caught.path.at(-1);
		const isPromise =
			isSupportedType && UnknownAsync.#methodsPromise.includes(lastPath);
		const isIterator =
			isSupportedType && UnknownAsync.#methodsIterator.includes(lastPath);
		if (isPromise) return UnknownAsyncType.Promise;
		if (isIterator) return UnknownAsyncType.Iterator;
		return UnknownAsyncType.None;
	}

	#promiseResolve: (value: unknown | PromiseLike<unknown>) => void;
	#promiseReject: (reason?: unknown) => void;
	#promiseRejectWhenReady?: () => void;
	// same as `Promise.withResolvers` (still relatively new in 2025)
	#promise = new Promise<unknown>((resolve, reject) => {
		this.#promiseResolve = (resolved) => {
			this.#promisedIteratorRejectWhenReady?.();
			resolve(resolved);
		};
		this.#promiseReject = (rejected) => {
			this.#promisedIteratorRejectWhenReady?.();
			reject(rejected);
		};
	});

	#promisedIteratorResolve: (
		value:
			| IterableIterator<unknown>
			| AsyncIterableIterator<unknown>
			| PromiseLike<IterableIterator<unknown> | AsyncIterableIterator<unknown>>,
	) => void;
	#promisedIteratorReject: (reason?: unknown) => void;
	#promisedIteratorRejectWhenReady?: () => void;
	// same as `Promise.withResolvers` (still relatively new in 2025)
	#promisedIterator = new Promise((resolve, reject) => {
		this.#promisedIteratorResolve = (resolved) => {
			this.#promiseRejectWhenReady?.();
			resolve(resolved);
		};
		this.#promisedIteratorReject = (rejected) => {
			this.#promiseRejectWhenReady?.();
			reject(rejected);
		};
	});

	/**
	 * This is specifically an iterator (not just an iterable) because we want to
	 * handle an iterator specifically (not other iterables like a Set or Map)
	 */
	#iterator = {
		[Symbol.asyncIterator]() {
			return this;
		},
		next: async (...args: unknown[]) => {
			if (this.#isIterable(this.#given)) {
				this.#promiseRejectWhenReady?.();
				return this.#given.next.apply(this.#given, args);
			}
			const promised = await this.#promisedIterator;
			if (this.#isIterable(promised)) {
				return promised.next.apply(promised, args);
			}
			throw new UnknownAsyncError(ReusableMessages.GivenNotIterable);
		},
		return: async (...args: unknown[]) => {
			if (this.#isIterable(this.#given)) {
				this.#promiseRejectWhenReady?.();
				return this.#given.return.apply(this.#given, args);
			}
			const promised = await this.#promisedIterator;
			if (this.#isIterable(promised)) {
				return promised.return.apply(promised, args);
			}
			throw new UnknownAsyncError(ReusableMessages.GivenNotIterable);
		},
		throw: async (...args: unknown[]) => {
			if (this.#isIterable(this.#given)) {
				this.#promiseRejectWhenReady?.();
				return this.#given.throw.apply(this.#given, args);
			}
			const promised = await this.#promisedIterator;
			if (this.#isIterable(promised)) {
				return promised.throw.apply(promised, args);
			}
			throw new UnknownAsyncError(ReusableMessages.GivenNotIterable);
		},
	} satisfies AsyncIterableIterator<unknown>;

	#isPromise(given: unknown, setGivenType = false): given is Promise<unknown> {
		if (this.#givenType === UnknownAsyncType.Promise) return true;
		const isPromiseResult = isPromise(given);
		// even if not a promise, the type is not invalid (but also not a promise)
		if (setGivenType && isPromiseResult) {
			this.#givenType = UnknownAsyncType.Promise;
		}
		return isPromiseResult;
	}

	#isIterable(
		given: unknown,
		setGivenType = false,
	): given is AsyncIterableIterator<unknown> | IterableIterator<unknown> {
		// if we already know given value was invalid, short-circuit
		if (this.#givenType === UnknownAsyncType.Iterator) return true;
		const isIteratorResult = isIterable(given);
		if (setGivenType && isIteratorResult) {
			this.#givenType = UnknownAsyncType.Iterator;
		} else if (setGivenType) {
			this.#givenType = UnknownAsyncType.Invalid;
		}
		return isIteratorResult;
	}

	#givenType = UnknownAsyncType.None;

	#checkAlreadyGiven() {
		if (!this.#givenType) return;
		throw new UnknownAsyncError(`Value already given (${this.#givenType})`);
	}

	#rejectFutureIterators(instant = false, customError?: Error) {
		if (instant) {
			this.#promisedIteratorReject(
				customError ?? new UnknownAsyncError(ReusableMessages.GivenNotIterable),
			);
			this.#notPreparedMethodCalls[UnknownAsyncType.Iterator] = false;
			return;
		}
		this.#promisedIteratorRejectWhenReady = () => {
			if (!this.#notPreparedMethodCalls[UnknownAsyncType.Iterator]) return;
			this.#rejectFutureIterators(true, customError);
		};
	}

	/**
	 * Expect proxy to return a promise (provide either promise or a value to be
	 * resolved)
	 */
	givePromise(promise: unknown) {
		if (!this.#handle.promises) {
			throw new TypeError("Promises can't be handled with provided options");
		}
		this.#checkAlreadyGiven();
		this.#given = promise;
		this.#isPromise(this.#given, true);
		this.#rejectFutureIterators(false);
		if (this.#isPromise(this.#given)) {
			this.#given.then(this.#promiseResolve).catch(this.#promiseReject);
		} else {
			this.#promiseResolve(this.#given);
		}
		return true;
	}

	#rejectFuturePromises(instant = false, customError?: Error) {
		if (instant) {
			this.#promiseReject(
				customError ?? new UnknownAsyncError(ReusableMessages.GivenNotPromise),
			);
			this.#notPreparedMethodCalls[UnknownAsyncType.Promise] = false;
			return;
		}
		this.#promiseRejectWhenReady = () => {
			if (!this.#notPreparedMethodCalls[UnknownAsyncType.Promise]) return;
			this.#rejectFuturePromises(true, customError);
		};
	}

	/**
	 * Expect proxy to return an iterator (provide either an iterator or an async
	 * iterator)
	 */
	giveIterator(iterable: unknown) {
		if (!this.#handle.iterators) {
			throw new TypeError("Iterators can't be handled with provided options");
		}
		this.#checkAlreadyGiven();
		this.#given = iterable;
		this.#isIterable(this.#given, true);
		this.#rejectFuturePromises(false);
		if (this.#isIterable(this.#given)) {
			this.#promisedIteratorResolve(this.#given);
		} else {
			throw new UnknownAsyncError(ReusableMessages.GivenNotIterable);
		}
		return true;
	}

	giveNothing(customError?: Error) {
		this.#checkAlreadyGiven();
		this.#givenType = UnknownAsyncType.Never;
		this.#rejectFuturePromises(true, customError);
		this.#rejectFutureIterators(true, customError);
		return true;
	}
}

export type HandleUnknownOptionsGranular = {
	iterators?: boolean;
	promises?: boolean;
};
export type HandleUnknownOptions = boolean | HandleUnknownOptionsGranular;

enum ReusableMessages {
	GivenNotIterable = "Given was not an iterable",
	GivenNotPromise = "Given was not a promise",
}
export class UnknownAsyncError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = "UnknownAsyncError";
	}
}

export enum UnknownAsyncType {
	None = 0,
	Promise,
	Iterator,
	Invalid,
	Never,
}

export type UnknownAsyncProxy =
	// biome-ignore lint/suspicious/noExplicitAny: We could return any type of promise or iterator
	AsyncIterableIterator<any, any, any> & Promise<any>; // & (() => Generator<any>);

export type CatchOptionsUnknownAsyncGranular = Omit<
	CatchOptionsGranular,
	"callFunction" | "propAccess"
>;
export type CatchOptionsUnknownAsync =
	| boolean
	| CatchOptionsUnknownAsyncGranular;

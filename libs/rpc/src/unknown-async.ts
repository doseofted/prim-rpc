import { isFunction, isPromise, isSymbol, isUndefined } from "es-toolkit";
import { isObject } from "es-toolkit/compat";
import {
	CallCatcher,
	type CallCondition,
	type CatchOptions,
	CaughtType,
} from "./call-catcher";

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
export class UnknownAsync<T = UnknownAsyncProxy> {
	#handle?: HandleUnknownOptions;
	constructor(handle?: HandleUnknownOptions) {
		this.#handle = handle;
	}

	#fallbackCondition?: CallCondition;
	/**
	 * When a method or property is accessed that doesn't exist, optionally
	 * provide a fallback handler for the properties accessed.
	 */
	setFallback(condition: CallCondition) {
		this.#fallbackCondition = condition;
	}

	/** Original promise or iterable given */
	#given?: unknown;

	#methodsPromise: PropertyKey[] = ["then", "catch", "finally"];
	#methodsIterator: PropertyKey[] = [
		"next",
		"return",
		"throw",
		Symbol.iterator,
		Symbol.asyncIterator,
	];
	/** Methods not to expose from proxy */
	#hiddenMethods: PropertyKey[] = [Symbol.iterator];
	/** Methods of either a promise or iterable */
	get #methods(): PropertyKey[] {
		return [...this.#methodsPromise, ...this.#methodsIterator].filter(
			(method) => !this.#hiddenMethods.includes(method),
		);
	}

	#notPreparedMethodCalls: Record<
		GivenType.Promise | GivenType.Iterator,
		boolean
	> = {
		[GivenType.Promise]: false,
		[GivenType.Iterator]: false,
	};

	#caughtOptions: CatchOptions = {
		callFunction: true,
		propAccess: true,
	};
	/**
	 * Promise or iterator methods can be called on this proxy before the promise
	 * or iterator is given the instance of this class.
	 */
	proxy = new CallCatcher<T>((next, stack) => {
		const caught = stack.at(-1);
		const methodName = caught.path.at(-1);
		const noMethodName = isUndefined(methodName);
		const includesMethodName = this.#methods.includes(methodName);
		const anonymousMethod = noMethodName && caught.type === CaughtType.Call;
		if (anonymousMethod) return next;
		const unsupportedMethod = !noMethodName && !includesMethodName;
		if (unsupportedMethod) return this.#fallbackCondition?.(next, stack);
		if (caught.type !== CaughtType.Call) return next;
		const includesPromiseMethod = this.#methodsPromise.includes(methodName);
		const notGivenPromiseType = this.#givenType !== GivenType.Promise;
		if (includesPromiseMethod && notGivenPromiseType) {
			this.#notPreparedMethodCalls[GivenType.Promise] = true;
		}
		const handlePromises = this.#handle.promises;
		if (includesPromiseMethod && !handlePromises) {
			this.#rejectFuturePromises(true);
		}
		if (includesPromiseMethod) {
			return this.#promise[methodName].apply(this.#promise, caught.args);
		}
		const includesIteratorMethod = this.#methodsIterator.includes(methodName);
		const notGivenIteratorType = this.#givenType !== GivenType.Iterator;
		if (includesIteratorMethod && notGivenIteratorType) {
			this.#notPreparedMethodCalls[GivenType.Iterator] = true;
		}
		const handleIterators = this.#handle.iterators;
		if (includesIteratorMethod && !handleIterators) {
			this.#rejectFutureIterators(true);
		}
		if (includesIteratorMethod) {
			return this.#iterator[methodName].apply(this.#iterator, caught.args);
		}
		return next; // this should be unreachable
	}, this.#caughtOptions).proxy;

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
	};

	#isPromise(given: unknown, setGivenType = false): given is Promise<unknown> {
		if (this.#givenType === GivenType.Promise) return true;
		const isPromiseResult = isPromise(given);
		// even if not a promise, the type is not invalid (but also not a promise)
		if (setGivenType && isPromiseResult) {
			this.#givenType = GivenType.Promise;
		}
		return isPromiseResult;
	}

	#isIterable(
		given: unknown,
		setGivenType = false,
	): given is AsyncIterableIterator<unknown> | IterableIterator<unknown> {
		// if we already know given value was invalid, short-circuit
		if (this.#givenType === GivenType.Iterator) return true;
		const isIterator =
			isObject(given) &&
			this.#methodsIterator
				.filter((given) => isSymbol(given))
				.some((property) => property in given && isFunction(given[property]));
		if (setGivenType) {
			this.#givenType = isIterator ? GivenType.Iterator : GivenType.Invalid;
		}
		return isIterator;
	}

	#givenType = GivenType.None;

	#checkAlreadyGiven() {
		if (!this.#givenType) return;
		throw new UnknownAsyncError(`Value already given (${this.#givenType})`);
	}

	#rejectFutureIterators(instant = false, customError?: Error) {
		if (instant) {
			this.#promisedIteratorReject(
				customError ?? new UnknownAsyncError(ReusableMessages.GivenNotIterable),
			);
			this.#notPreparedMethodCalls[GivenType.Iterator] = false;
			return;
		}
		this.#promisedIteratorRejectWhenReady = () => {
			if (!this.#notPreparedMethodCalls[GivenType.Iterator]) return;
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
			this.#notPreparedMethodCalls[GivenType.Promise] = false;
			return;
		}
		this.#promiseRejectWhenReady = () => {
			if (!this.#notPreparedMethodCalls[GivenType.Promise]) return;
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
		this.#givenType = GivenType.Never;
		this.#rejectFuturePromises(true, customError);
		this.#rejectFutureIterators(true, customError);
		return true;
	}
}

export type HandleUnknownOptions = {
	iterators?: boolean;
	promises?: boolean;
};

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

enum GivenType {
	None = 0,
	Promise,
	Iterator,
	Invalid,
	Never,
}

export type UnknownAsyncProxy =
	// biome-ignore lint/suspicious/noExplicitAny: We could return any type of promise or iterator
	AsyncIterableIterator<any, any, any> & Promise<any>; // & (() => Generator<any>);

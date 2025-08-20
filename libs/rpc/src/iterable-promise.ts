import { isFunction, isPromise, isSymbol } from "es-toolkit";
import { isObject } from "es-toolkit/compat";
import { DeepProxy } from "proxy-deep";

enum ReusableMessages {
	GivenNotIterable = "Given was not an iterable",
	GivenNotPromise = "Given was not a promise",
}
export class ToBeDeterminedError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = "ToBeDeterminedError";
	}
}

enum GivenType {
	None = 0,
	Promise,
	Iterator,
	Invalid,
	Never,
}

export type ToBeDeterminedProxy =
	// biome-ignore lint/suspicious/noExplicitAny: We could return any type of promise or iterator
	AsyncIterableIterator<any, any, any> & Promise<any>; // & (() => Generator<any>);

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
export class ToBeDetermined<T extends ToBeDeterminedProxy> {
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

	/**
	 * Promise or iterator methods can be called on this proxy before the promise
	 * or iterator is given the instance of this class.
	 */
	proxy = new DeepProxy(this, {
		get(_target, property, _receiver) {
			if (this.rootTarget.#methods.includes(property)) {
				return this.nest(() => null);
			}
		},
		apply(_target, _thisArg, argArray) {
			const methodName = this.path.at(-1) as PropertyKey;
			const includesPromiseMethod =
				this.rootTarget.#methodsPromise.includes(methodName);
			if (includesPromiseMethod) {
				if (this.rootTarget.#givenType !== GivenType.Promise) {
					this.rootTarget.#notPreparedMethodCalls[GivenType.Promise] = true;
				}
				// if given nothing, return a promise that once given
				// - an iterable, rejects with error (given was not expected)
				// - a promise, resolves/rejects to promise result
				// if given a promise, return the promise
				// if given an iterable, give error
				return this.rootTarget.#promise[methodName].apply(
					this.rootTarget.#promise,
					argArray,
				);
			}
			const includesIteratorMethod =
				this.rootTarget.#methodsIterator.includes(methodName);
			if (includesIteratorMethod) {
				if (this.rootTarget.#givenType !== GivenType.Iterator) {
					this.rootTarget.#notPreparedMethodCalls[GivenType.Iterator] = true;
				}
				// if given nothing, return an async iterator that once given
				// - an iterable, iterate with given method
				// - a promise, throws error on next iteration (given was not expected)
				// if given a promise, error
				// if given an iterator, return iterator
				return this.rootTarget.#iterator[methodName].apply(
					this.rootTarget.#iterator,
					argArray,
				);
			}
			// return get(this.rootTarget.#given, this.path)(...argArray);
		},
	}) as unknown as T;

	#promise: Promise<unknown>;
	#promiseResolve: (value: unknown | PromiseLike<unknown>) => void;
	#promiseReject: (reason?: unknown) => void;
	#promiseRejectWhenReady?: () => void;

	#promisedIterator: Promise<
		IterableIterator<unknown> | AsyncIterableIterator<unknown>
	>;
	#promisedIteratorResolve: (
		value:
			| IterableIterator<unknown>
			| AsyncIterableIterator<unknown>
			| PromiseLike<IterableIterator<unknown> | AsyncIterableIterator<unknown>>,
	) => void;
	#promisedIteratorReject: (reason?: unknown) => void;
	#promisedIteratorRejectWhenReady?: () => void;

	/**
	 * This is specifically an iterator (not just an iterable) because we want to
	 * handle an iterator specifically (not other iterables like a Set or Map)
	 */
	#iterator: AsyncIterableIterator<unknown>;

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

	constructor() {
		// same as `Promise.withResolvers` (still relatively new in 2025)
		this.#promise = new Promise<unknown>((resolve, reject) => {
			this.#promiseResolve = (resolved) => {
				this.#promisedIteratorRejectWhenReady?.();
				resolve(resolved);
			};
			this.#promiseReject = (rejected) => {
				this.#promisedIteratorRejectWhenReady?.();
				reject(rejected);
			};
		});
		this.#promisedIterator = new Promise((resolve, reject) => {
			this.#promisedIteratorResolve = (resolved) => {
				this.#promiseRejectWhenReady?.();
				resolve(resolved);
			};
			this.#promisedIteratorReject = (rejected) => {
				this.#promiseRejectWhenReady?.();
				reject(rejected);
			};
		});
		this.#iterator = {
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
				throw new ToBeDeterminedError(ReusableMessages.GivenNotIterable);
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
				throw new ToBeDeterminedError(ReusableMessages.GivenNotIterable);
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
				throw new ToBeDeterminedError(ReusableMessages.GivenNotIterable);
			},
		};
	}

	#givenType = GivenType.None;

	#checkAlreadyGiven() {
		if (!this.#givenType) return;
		throw new ToBeDeterminedError(`Value already given (${this.#givenType})`);
	}

	/**
	 * Expect proxy to return a promise (provide either promise or a value to be
	 * resolved)
	 */
	givePromise(promise: unknown) {
		this.#checkAlreadyGiven();
		this.#given = promise;
		this.#isPromise(this.#given, true);
		this.#promisedIteratorRejectWhenReady = () => {
			if (!this.#notPreparedMethodCalls[GivenType.Iterator]) return;
			this.#promisedIteratorReject(
				new ToBeDeterminedError(ReusableMessages.GivenNotIterable),
			);
			this.#notPreparedMethodCalls[GivenType.Iterator] = false;
		};
		if (this.#isPromise(this.#given)) {
			this.#given.then(this.#promiseResolve).catch(this.#promiseReject);
		} else {
			this.#promiseResolve(this.#given);
		}
		return true;
	}

	/**
	 * Expect proxy to return an iterator (provide either an iterator or an async
	 * iterator)
	 */
	giveIterator(iterable: unknown) {
		this.#checkAlreadyGiven();
		this.#given = iterable;
		this.#isIterable(this.#given, true);
		this.#promiseRejectWhenReady = () => {
			if (!this.#notPreparedMethodCalls[GivenType.Promise]) return;
			this.#promiseReject(
				new ToBeDeterminedError(ReusableMessages.GivenNotPromise),
			);
			this.#notPreparedMethodCalls[GivenType.Promise] = false;
		};
		if (this.#isIterable(this.#given)) {
			this.#promisedIteratorResolve(this.#given);
		} else {
			throw new ToBeDeterminedError(ReusableMessages.GivenNotIterable);
		}
		return true;
	}

	giveNothing() {
		this.#checkAlreadyGiven();
		this.#givenType = GivenType.Never;
		this.#promiseReject(
			new ToBeDeterminedError(ReusableMessages.GivenNotPromise),
		);
		this.#notPreparedMethodCalls[GivenType.Promise] = false;
		this.#promisedIteratorReject(
			new ToBeDeterminedError(ReusableMessages.GivenNotIterable),
		);
		this.#notPreparedMethodCalls[GivenType.Iterator] = false;
		return true;
	}
}

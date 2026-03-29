import { isPromise, isUndefined } from "es-toolkit";
import { createNanoEvents, type Unsubscribe } from "nanoevents";
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
import {
	isMethodAsyncIterator,
	isMethodIterator,
	isMethodPromise,
} from "./utils/method-name-guards";

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
	#handle: HandleUnknownOptionsGranular;
	#defaultCatchOptions: CatchOptionsGranular;

	#emitter = createNanoEvents<UnknownAsyncEvents>();
	on<T extends keyof UnknownAsyncEvents>(
		type: T,
		callback: UnknownAsyncEvents[T],
	): Unsubscribe {
		return this.#emitter.on(type, callback);
	}

	constructor(handle: HandleUnknownOptions = true) {
		const defaultCatchOptions: CatchOptionsGranular = {
			callFunction: true,
			propAccess: true,
		};
		const handler: CallCondition = (next, stack) => {
			const caught = stack.at(-1);
			const intendedForFallback =
				!UnknownAsync.#shouldCaughtBeProcessed(caught);
			const methodName = caught?.path.at(-1);
			const noMethodName = isUndefined(methodName);
			const includesMethodName =
				isMethodPromise(methodName) || isMethodAsyncIterator(methodName);
			const anonymousMethod = noMethodName && caught?.type === CaughtType.Call;
			if (anonymousMethod) return next;
			const unsupportedMethod = !noMethodName && !includesMethodName;
			if (unsupportedMethod || intendedForFallback)
				return this.#fallbackCondition?.(next, stack);
			if (caught && caught.type !== CaughtType.Call) return next;
			const includesPromiseMethod = isMethodPromise(methodName);
			const notGivenPromiseType = this.#givenType !== UnknownAsyncType.Promise;
			if (includesPromiseMethod && notGivenPromiseType) {
				this.#notPreparedMethodCalls[UnknownAsyncType.Promise] = true;
				// If giveIterator() already ran, the "when ready" callback was
				// a no-op because this flag wasn't set yet. Re-trigger it now.
				this.#promiseRejectWhenReady?.();
			}
			const handlePromises = this.#handle.promises;
			if (includesPromiseMethod && !handlePromises) {
				this.#rejectFuturePromises(true);
			}
			if (includesPromiseMethod) {
				this.#emitter.emit("awaited", "promise", methodName);
				const promiseArgs = caught?.args ?? [];
				const functionReference = this.#promise[methodName] as UnknownFunction;
				return functionReference.apply(this.#promise, promiseArgs);
			}
			const includesIteratorMethod =
				isMethodAsyncIterator(methodName) || isMethodIterator(methodName);
			const notGivenIteratorType =
				this.#givenType !== UnknownAsyncType.Iterator;
			if (includesIteratorMethod && notGivenIteratorType) {
				this.#notPreparedMethodCalls[UnknownAsyncType.Iterator] = true;
				// If givePromise() already ran, the "when ready" callback was
				// a no-op because this flag wasn't set yet. Re-trigger it now.
				this.#promisedIteratorRejectWhenReady?.();
			}
			const handleIterators = this.#handle.iterators;
			if (includesIteratorMethod && !handleIterators) {
				this.#rejectFutureIterators(true);
			}
			if (includesIteratorMethod) {
				this.#emitter.emit("awaited", "iterator", methodName);
				const iteratorArgs = caught?.args ?? [];
				const functionReference = this.#iterator[methodName] as UnknownFunction;
				return functionReference.apply(this.#iterator, iteratorArgs);
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

	#notPreparedMethodCalls: Record<
		UnknownAsyncType.Promise | UnknownAsyncType.Iterator,
		boolean
	> = {
		[UnknownAsyncType.Promise]: false,
		[UnknownAsyncType.Iterator]: false,
	};

	static #shouldCaughtBeProcessed(caught?: Caught) {
		const isCall = caught?.type === CaughtType.Call;
		const isCallFunc = isCall && caught.callMethod === CaughtCallType.Function;
		const isProp = caught?.type === CaughtType.Prop;
		const isPropAccess = isProp && caught.interaction === CaughtPropType.Access;
		return (isCallFunc && CaughtType.Call) || (isPropAccess && CaughtType.Prop);
	}

	static determineCaughtType(caught: Caught): UnknownAsyncType {
		const isSupportedType = UnknownAsync.#shouldCaughtBeProcessed(caught);
		const lastPath = caught.path.at(-1);
		const isPromise = isSupportedType && isMethodPromise(lastPath);
		const isIterator =
			isSupportedType &&
			(isMethodAsyncIterator(lastPath) || isMethodIterator(lastPath));
		if (isPromise) return UnknownAsyncType.Promise;
		if (isIterator) return UnknownAsyncType.Iterator;
		return UnknownAsyncType.None;
	}

	#promiseResolve?: (value: unknown | PromiseLike<unknown>) => void;
	#promiseReject?: (reason?: unknown) => void;
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

	#promisedIteratorResolve?: (
		value:
			| IterableIterator<unknown>
			| AsyncIterableIterator<unknown>
			| PromiseLike<IterableIterator<unknown> | AsyncIterableIterator<unknown>>,
	) => void;
	#promisedIteratorReject?: (reason?: unknown) => void;
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
				const nextFunction = this.#given.next as UnknownFunction;
				return nextFunction?.apply(
					this.#given,
					args,
				) as IteratorResult<unknown>;
			}
			const promised = await this.#promisedIterator;
			if (this.#isIterable(promised)) {
				const nextFunction = promised.next as UnknownFunction;
				return nextFunction?.apply(promised, args) as IteratorResult<unknown>;
			}
			throw new UnknownAsyncError(ReusableMessages.GivenNotIterable);
		},
		return: async (...args: unknown[]) => {
			if (this.#isIterable(this.#given)) {
				this.#promiseRejectWhenReady?.();
				const returnFunction = this.#given.return as UnknownFunction;
				return returnFunction?.apply(
					this.#given,
					args,
				) as IteratorResult<unknown>;
			}
			const promised = await this.#promisedIterator;
			if (this.#isIterable(promised)) {
				const returnFunction = promised.return as UnknownFunction;
				return returnFunction?.apply(promised, args) as IteratorResult<unknown>;
			}
			throw new UnknownAsyncError(ReusableMessages.GivenNotIterable);
		},
		throw: async (...args: unknown[]) => {
			if (this.#isIterable(this.#given)) {
				this.#promiseRejectWhenReady?.();
				const throwFunction = this.#given.throw as UnknownFunction;
				return throwFunction?.apply(
					this.#given,
					args,
				) as IteratorResult<unknown>;
			}
			const promised = await this.#promisedIterator;
			if (this.#isIterable(promised)) {
				const throwFunction = promised.throw as UnknownFunction | undefined;
				return throwFunction?.apply(promised, args) as IteratorResult<unknown>;
			}
			throw new UnknownAsyncError(ReusableMessages.GivenNotIterable);
		},
	} satisfies AsyncIterableIterator<unknown, unknown, unknown>;

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
			this.#promisedIteratorReject?.(
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
			this.#promiseResolve?.(this.#given);
		}
		return true;
	}

	#rejectFuturePromises(instant = false, customError?: Error) {
		if (instant) {
			this.#promiseReject?.(
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
			this.#promisedIteratorResolve?.(this.#given);
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

type UnknownFunction = (...args: unknown[]) => unknown;

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

export type UnknownAsyncEvents = {
	awaited(type: "promise" | "iterator", method: PropertyKey): void;
};

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	type HandleUnknownOptions,
	UnknownAsync,
	UnknownAsyncError,
} from "./unknown-async";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const handle: HandleUnknownOptions = {
	promises: true,
	iterators: true,
};

describe.todo("UnknownAsync can be configured", () => {
	// ...
});

describe("UnknownAsync throws errors when invalid values are given", () => {
	test("value can only be given once", async () => {
		const tbd = new UnknownAsync(handle);
		const promised = Promise.resolve(42);
		expect(tbd.givePromise(promised)).toBe(true);
		expect(() => tbd.givePromise(promised)).toThrowError(UnknownAsyncError);
	});

	test("proxies only supported properties", async () => {
		const tbd = new UnknownAsync(handle);
		const promised = Promise.resolve(42);
		expect(tbd.givePromise(promised)).toBe(true);
		expect(tbd.proxy.then).toBeDefined();
		expect(tbd.proxy.catch).toBeDefined();
		expect(tbd.proxy.finally).toBeDefined();
		expect(tbd.proxy.next).toBeDefined();
		expect(tbd.proxy.return).toBeDefined();
		expect(tbd.proxy.throw).toBeDefined();
		expect(tbd.proxy[Symbol.asyncIterator]).toBeDefined();
		// biome-ignore lint/suspicious/noExplicitAny: purposely giving unsupported properties
		const proxy = tbd.proxy as any;
		expect(proxy.iDoNotExist).toBeUndefined();
		// proxied iterator will become async iterator
		expect(proxy[Symbol.iterator]).toBeUndefined();
	});

	test("promises can be resolved only when promised value is given", async () => {
		const tbd = new UnknownAsync(handle);
		async function iteration() {
			for await (const _ of tbd.proxy) {
				expect.unreachable();
			}
		}
		const expectIterationFails = expect(iteration()).rejects.toThrowError(
			UnknownAsyncError,
		);
		const expectPromiseResolve = expect(tbd.proxy).resolves.toBe(42);
		setTimeout(() => {
			// if we give a promise resolving to an iterator, that's valid to await
			// if we give an iterator, that's not valid to await
			tbd.givePromise(Promise.resolve(42));
		}, 3_000);
		vi.runAllTimers();
		await Promise.all([expectIterationFails, expectPromiseResolve]);
	});

	test("iteration can happen only when iterator is given", async () => {
		const tbd = new UnknownAsync(handle);
		function* generator() {
			yield 1;
		}
		const expectPromiseReject = expect(tbd.proxy).rejects.toThrowError(
			UnknownAsyncError,
		);
		const iterationSucceeds1 = expect(tbd.proxy.next()).resolves.toEqual({
			value: 1,
			done: false,
		});
		const iterationSucceeds2 = expect(tbd.proxy.next()).resolves.toEqual({
			done: true,
		});
		setTimeout(() => {
			tbd.giveIterator(generator());
		}, 3_000);
		vi.runAllTimers();
		await Promise.all([
			expectPromiseReject,
			iterationSucceeds1,
			iterationSucceeds2,
		]);
	});

	test("can only resolve or iterate when something is given", async () => {
		const tbd = new UnknownAsync(handle);
		tbd.giveNothing();
		const failPromise = expect(tbd.proxy).rejects.toThrowError(
			UnknownAsyncError,
		);
		const failIterator = expect(tbd.proxy.next()).rejects.toThrowError(
			UnknownAsyncError,
		);
		await Promise.all([failPromise, failIterator]);
	});

	test("can only resolve or iterate when something is given eventually", async () => {
		const tbd = new UnknownAsync(handle);
		const failPromise = expect(tbd.proxy).rejects.toThrowError(
			UnknownAsyncError,
		);
		const failIterator = expect(tbd.proxy.next()).rejects.toThrowError(
			UnknownAsyncError,
		);
		setTimeout(() => {
			tbd.giveNothing();
		}, 3_000);
		vi.runAllTimers();
		await Promise.all([failPromise, failIterator]);
	});

	test("rejects with custom error when nothing is given", async () => {
		const tbd = new UnknownAsync(handle);
		class CustomError extends Error {
			constructor(message?: string) {
				super(message);
				this.name = "CustomError";
			}
		}
		const failPromise = expect(tbd.proxy).rejects.toThrowError(CustomError);
		const failIterator = expect(tbd.proxy.next()).rejects.toThrowError(
			CustomError,
		);
		setTimeout(() => {
			tbd.giveNothing(new CustomError("It's custom now."));
		}, 3_000);
		vi.runAllTimers();
		await Promise.all([failPromise, failIterator]);
	});
});

describe("UnknownAsync supports promises", () => {
	test("resolves promise with promise given", async () => {
		const value = 42;
		const promised = Promise.resolve(value);
		const promise = new UnknownAsync(handle);
		promise.givePromise(promised);
		await expect(promise.proxy).resolves.toBe(value);
	});

	test("resolves promise with non-promise given", async () => {
		const promise = new UnknownAsync(handle);
		const value = 42;
		promise.givePromise(value);
		await expect(promise.proxy).resolves.toBe(value);
	});

	test("resolves without given value prior", async () => {
		const value = 42;
		const promise = Promise.resolve(value);
		const iterablePromise = new UnknownAsync(handle);
		setTimeout(() => {
			iterablePromise.givePromise(promise);
		}, 3_000);
		const expectResolves = expect(iterablePromise.proxy).resolves.toBe(value);
		vi.runAllTimers();
		const callback1 = vi.fn();
		try {
			await iterablePromise.proxy.finally(callback1);
		} catch (_error) {
			expect.unreachable();
		} finally {
			const callback2 = vi.fn();
			callback2();
			expect(callback2).toHaveBeenCalled();
		}
		expect(callback1).toHaveBeenCalled();
		await expectResolves;
	});

	test("rejects without given value prior", async () => {
		const error = new Error("Uh-oh");
		const promise = Promise.reject(error);
		const iterablePromise = new UnknownAsync(handle);
		setTimeout(() => {
			iterablePromise.givePromise(promise);
		}, 3_000);
		const expectThrows = expect(iterablePromise.proxy).rejects.toThrow(error);
		vi.runAllTimers();
		const callback1 = vi.fn();
		try {
			await iterablePromise.proxy.finally(callback1);
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
		} finally {
			const callback2 = vi.fn();
			callback2();
			expect(callback2).toHaveBeenCalled();
		}
		expect(callback1).toHaveBeenCalled();
		await expectThrows;
	});
});

describe("UnknownAsync supports iterators", () => {
	test("exposes async iterator symbol", async () => {
		const iterable = new UnknownAsync(handle);
		function* generator() {
			yield 1;
		}
		// iterators returned from instance are async regardless of what's given
		iterable.giveIterator(generator());
		expect(iterable.proxy[Symbol.iterator]).not.toBeDefined();
		expect(iterable.proxy[Symbol.asyncIterator]).toBeDefined();
	});

	test("can be iterated with awaited for-of loop", async () => {
		const iterable = new UnknownAsync(handle);
		function* generator() {
			yield 1;
			yield 2;
			yield 3;
		}
		// iterators returned from instance are async regardless of what's given
		const callback = vi.fn();
		iterable.giveIterator(generator());
		const orderedYield = new Array(3);
		async function runLoop() {
			let i = 0;
			for await (const given of iterable.proxy) {
				callback(given);
				orderedYield[i++] = given;
			}
		}
		await expect(runLoop()).resolves.not.toThrow();
		expect(callback).toHaveBeenCalledTimes(3);
		expect(callback).toHaveBeenCalledWith(1);
		expect(callback).toHaveBeenCalledWith(2);
		expect(callback).toHaveBeenCalledWith(3);
		expect(orderedYield).toEqual([1, 2, 3]);
	});

	test("iterates with next method", async () => {
		const iterable = new UnknownAsync(handle);
		function* generator() {
			yield 1;
			yield 2;
			yield 3;
		}
		iterable.giveIterator(generator());
		await expect(iterable.proxy.next()).resolves.toEqual({
			value: 1,
			done: false,
		});
		await expect(iterable.proxy.next()).resolves.toEqual({
			value: 2,
			done: false,
		});
		await expect(iterable.proxy.next()).resolves.toEqual({
			value: 3,
			done: false,
		});
		await expect(iterable.proxy.next()).resolves.toEqual({
			value: undefined,
			done: true,
		});
	});

	test("can use throw method", async () => {
		const iterable = new UnknownAsync(handle);
		const errorCaught = vi.fn();
		function* generator() {
			try {
				yield 1;
				yield 2;
			} catch (error) {
				errorCaught(error);
			}
			yield 3;
		}
		iterable.giveIterator(generator());
		await expect(iterable.proxy.next()).resolves.toEqual({
			value: 1,
			done: false,
		});
		await expect(iterable.proxy.next()).resolves.toEqual({
			value: 2,
			done: false,
		});
		const errorToCatch = new Error("Test 1");
		await expect(iterable.proxy.throw(errorToCatch)).resolves.toEqual({
			value: 3,
			done: false,
		});
		expect(errorCaught).toHaveBeenCalledWith(errorToCatch);
		const errorNotToCatch = new Error("Test 2");
		await expect(iterable.proxy.throw(errorNotToCatch)).rejects.toThrow(
			errorNotToCatch,
		);
		await expect(iterable.proxy.next()).resolves.toEqual({ done: true });
	});

	test("can return early from iterator", async () => {
		const iterable = new UnknownAsync(handle);
		function* generator() {
			yield 1;
			yield 2;
			yield 3;
		}
		iterable.giveIterator(generator());
		await expect(iterable.proxy.next()).resolves.toEqual({
			value: 1,
			done: false,
		});
		await expect(iterable.proxy.return(4)).resolves.toEqual({
			value: 4,
			done: true,
		});
		await expect(iterable.proxy.next()).resolves.toEqual({ done: true });
	});

	test("iterates regardless of iterator's next method's resolve order", async () => {
		const expectedYieldOrder = [1, 2, 3];
		const orderedYield: number[] = [];
		const timers = expectedYieldOrder.map(
			(value) =>
				new Promise<void>((resolve) =>
					setTimeout(resolve, 4_000 - value * 1_000),
				),
		);
		const expectedExecuteOrder = [3, 2, 1];
		const executeOrder: number[] = [];
		const iterator: AsyncIterableIterator<number> & { value: number } = {
			value: expectedYieldOrder[0],
			[Symbol.asyncIterator]() {
				return this;
			},
			async next() {
				if (this.value < 4) {
					orderedYield.push(this.value);
					const value = this.value++;
					await timers.shift();
					executeOrder.push(value);
					return { value, done: false };
				}
				return { value: undefined, done: true };
			},
		};
		const iterable = new UnknownAsync(handle);
		iterable.giveIterator(iterator);
		const expected = expect(
			Promise.all([
				iterable.proxy.next(),
				iterable.proxy.next(),
				iterable.proxy.next(),
				iterable.proxy.next(),
			]),
		).resolves.toEqual(
			expectedYieldOrder
				.map((value) => ({ value, done: false }))
				.concat({ value: undefined, done: true }),
		);
		vi.runAllTimers();
		await expected;
		expect(orderedYield).toEqual(expectedYieldOrder);
		expect(executeOrder).toEqual(expectedExecuteOrder);
	});

	test("iterates with an async next method", async () => {
		const iterable = new UnknownAsync(handle);
		async function* generator() {
			yield 1;
			yield 2;
			yield 3;
		}
		iterable.giveIterator(generator());
		await expect(iterable.proxy.next()).resolves.toEqual({
			value: 1,
			done: false,
		});
		await expect(iterable.proxy.next()).resolves.toEqual({
			value: 2,
			done: false,
		});
		await expect(iterable.proxy.next()).resolves.toEqual({
			value: 3,
			done: false,
		});
		await expect(iterable.proxy.next()).resolves.toEqual({
			done: true,
		});
	});

	test("iterates with next method without given value prior", async () => {
		const iterable = new UnknownAsync(handle);
		function* generator() {
			yield 1;
			yield 2;
			yield 3;
		}
		setTimeout(() => {
			iterable.giveIterator(generator());
		}, 3_000);
		const expected1 = expect(iterable.proxy.next()).resolves.toEqual({
			value: 1,
			done: false,
		});
		const expected2 = expect(iterable.proxy.next()).resolves.toEqual({
			value: 2,
			done: false,
		});
		const expected3 = expect(iterable.proxy.next()).resolves.toEqual({
			value: 3,
			done: false,
		});
		const expected4 = expect(iterable.proxy.next()).resolves.toEqual({
			done: true,
		});
		vi.runAllTimers();
		await Promise.all([expected1, expected2, expected3, expected4]);
	});
});

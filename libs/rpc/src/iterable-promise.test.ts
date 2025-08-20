import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ToBeDetermined, ToBeDeterminedError } from "./iterable-promise";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("ToBeDetermined throws errors when invalid values are given", () => {
	test("value can only be given once", async () => {
		const tbd = new ToBeDetermined();
		const promised = Promise.resolve(42);
		expect(tbd.givePromise(promised)).toBe(true);
		expect(() => tbd.givePromise(promised)).toThrowError(ToBeDeterminedError);
	});

	test("promises can be resolved only when promised value is given", async () => {
		const tbd = new ToBeDetermined();
		async function iteration() {
			for await (const _ of tbd.proxy) {
				expect.unreachable();
			}
		}
		const expectIterationFails = expect(iteration()).rejects.toThrowError(
			ToBeDeterminedError,
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
		const tbd = new ToBeDetermined();
		function* generator() {
			yield 1;
		}
		const expectPromiseReject = expect(tbd.proxy).rejects.toThrowError(
			ToBeDeterminedError,
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
		const tbd = new ToBeDetermined();
		tbd.giveNothing();
		const failPromise = expect(tbd.proxy).rejects.toThrowError(
			ToBeDeterminedError,
		);
		const failIterator = expect(tbd.proxy.next()).rejects.toThrowError(
			ToBeDeterminedError,
		);
		await Promise.all([failPromise, failIterator]);
	});

	test("can only resolve or iterate when something is given eventually", async () => {
		const tbd = new ToBeDetermined();
		const failPromise = expect(tbd.proxy).rejects.toThrowError(
			ToBeDeterminedError,
		);
		const failIterator = expect(tbd.proxy.next()).rejects.toThrowError(
			ToBeDeterminedError,
		);
		setTimeout(() => {
			tbd.giveNothing();
		}, 3_000);
		vi.runAllTimers();
		await Promise.all([failPromise, failIterator]);
	});
});

describe("ToBeDetermined supports promises", () => {
	test("resolves promise with promise given", async () => {
		const value = 42;
		const promised = Promise.resolve(value);
		const promise = new ToBeDetermined();
		promise.givePromise(promised);
		await expect(promise.proxy).resolves.toBe(value);
	});

	test("resolves promise with non-promise given", async () => {
		const promise = new ToBeDetermined();
		const value = 42;
		promise.givePromise(value);
		await expect(promise.proxy).resolves.toBe(value);
	});

	test("resolves without given value prior", async () => {
		const value = 42;
		const promise = Promise.resolve(value);
		const iterablePromise = new ToBeDetermined();
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
		const iterablePromise = new ToBeDetermined();
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

describe("ToBeDetermined supports iterators", () => {
	test("exposes async iterator symbol", async () => {
		const iterable = new ToBeDetermined();
		function* generator() {
			yield 1;
		}
		// iterators returned from instance are async regardless of what's given
		iterable.giveIterator(generator());
		expect(iterable.proxy[Symbol.iterator]).not.toBeDefined();
		expect(iterable.proxy[Symbol.asyncIterator]).toBeDefined();
	});

	test("can be iterated with awaited for-of loop", async () => {
		const iterable = new ToBeDetermined();
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
		const iterable = new ToBeDetermined();
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
		const iterable = new ToBeDetermined();
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
		const iterable = new ToBeDetermined();
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
		const iterable = new ToBeDetermined();
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
		const iterable = new ToBeDetermined();
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
		const iterable = new ToBeDetermined();
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

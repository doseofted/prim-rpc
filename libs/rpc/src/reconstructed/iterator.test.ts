import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ReconstructedIterator } from "./iterator";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("ReconstructedIterator can be used", () => {
	test("with its methods before iterator methods are provided", async () => {
		const reconstructed = new ReconstructedIterator();
		const expected1 = expect(reconstructed.value.next()).resolves.toEqual({
			value: 3,
			done: false,
		});
		const expected2 = expect(reconstructed.value.next()).resolves.toEqual({
			value: 2,
			done: false,
		});
		const expected3 = expect(reconstructed.value.next()).resolves.toEqual({
			value: 1,
			done: false,
		});
		const expected4 = expect(reconstructed.value.next()).resolves.toEqual({
			value: 0,
			done: true,
		});
		let max = 3;
		reconstructed.admin.onNext(() => {
			return { value: max--, done: max < 0 };
		});
		await Promise.all([expected1, expected2, expected3, expected4]);
	});

	test("with a for await loop before iterator methods are provided", async () => {
		let max = 3;
		const reconstructed = new ReconstructedIterator();
		setTimeout(() => {
			reconstructed.admin.onNext(() => {
				return { value: max--, done: max < 0 };
			});
		}, 3_000);
		vi.runAllTimers();
		async function getIterations() {
			const recorded: unknown[] = [];
			for await (const iteration of reconstructed.value) {
				recorded.push(iteration);
			}
			return recorded;
		}
		await expect(getIterations()).resolves.toEqual([3, 2, 1]);
	});
});

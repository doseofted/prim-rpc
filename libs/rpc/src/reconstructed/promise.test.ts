import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ReconstructedPromise } from "./promise";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("ReconstructedPromise can be used", () => {
	test("with its resolve method before promise methods are provided", async () => {
		const reconstructed = new ReconstructedPromise();
		const expected = expect(reconstructed.value).resolves.toBe(42);
		setTimeout(() => {
			reconstructed.admin.resolve(42);
		}, 3_000);
		vi.runAllTimers();
		await expected;
	});

	test("with its reject method before promise methods are provided", async () => {
		const reconstructed = new ReconstructedPromise();
		const expected = expect(reconstructed.value).rejects.toThrow(Error);
		setTimeout(() => {
			reconstructed.admin.reject(new Error("Error"));
		}, 3_000);
		vi.runAllTimers();
		await expected;
	});
});

import { expect, test, describe } from "vitest"
import { handlePotentialPromise } from "./wrapper"

describe("Promises can be easily handled", () => {
	test("promise given", async () => {
		const hello = handlePotentialPromise(Promise.resolve("hello"), value => {
			return value
		})
		await expect(hello).resolves.toBe("hello")
	})

	test("promise returned", async () => {
		const hello = handlePotentialPromise("hello", value => {
			return Promise.resolve(value)
		})
		await expect(hello).resolves.toBe("hello")
	})

	test("promise given and returned", async () => {
		const hello = handlePotentialPromise(Promise.resolve("hello"), value => {
			return Promise.resolve(value)
		})
		await expect(hello).resolves.toBe("hello")
	})

	test("no promise", () => {
		const hello = handlePotentialPromise("hello", value => {
			return value
		})
		expect(hello).toBe("hello")
	})
})

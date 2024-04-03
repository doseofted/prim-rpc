// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { expect, test, describe } from "vitest"
import { handlePotentialPromise } from "./wrapper"

describe("Promises can be easily handled without using async functions", () => {
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

	test("promise rejected", async () => {
		const hello = handlePotentialPromise(Promise.reject("oops"), () => {})
		await expect(hello).rejects.toBe("oops")
	})

	test("promise rejected, overridden", async () => {
		const hello = handlePotentialPromise(
			Promise.resolve("hello"),
			() => {
				throw "hi!"
			},
			() => {
				throw "oops"
			}
		)
		await expect(hello).rejects.toBe("oops")
	})

	test("no promise", () => {
		const hello = handlePotentialPromise("hello", value => {
			return value
		})
		expect(hello).toBe("hello")
	})

	test("no promise, throws", () => {
		const thrown = () =>
			handlePotentialPromise("hello", value => {
				throw value
			})
		expect(thrown).toThrow("hello")
	})
})

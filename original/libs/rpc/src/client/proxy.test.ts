// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "vitest"
import { createMethodCatcher } from "./proxy"
import type { RpcCall } from "../types/rpc-structure"

type PotentialModuleShape = {
	this: {
		is(): {
			next(): RpcCall
			a: {
				test(): {
					ok: {
						$end(): RpcCall
					}
				}
				generator(): Generator<number>
			}
			an: {
				asyncGenerator(): AsyncGenerator<number>
			}
		}
	}
	testing: {
		next(): string
		nonPromise: () => string
		promise: () => Promise<string>
	}
	test: {
		testing(name: string): {
			test: {
				tested(name: string): Promise<RpcCall>
			}
		}
	}
	hello: (name: string, greeting: string) => Promise<RpcCall>
	select: {
		from: (table: string) => {
			where: (
				column: string,
				operator: string,
				value: number
			) => {
				execute: () => Promise<RpcCall>
			}
		}
	}
}

describe("RPC proxy creates RPC-like structure, including chains", () => {
	const given = createMethodCatcher<PotentialModuleShape>({
		onMethod(rpc, next) {
			const keyword = "$end"
			const method = [rpc.method, rpc.chain?.map(c => c.method)].flat().filter(Boolean).join(".")
			const keywordFound = method.endsWith(keyword)
			if (keywordFound) {
				rpc.id = 123
				return rpc
			}
			if (method === "testing.nonPromise") {
				return "Hello"
			} else if (method === "testing.promise") {
				return new Promise(r => r("Hello"))
			} else if (method === "testing.next") {
				return "I'm next!"
			}
			return next
		},
		onAwaited(rpc, _next) {
			rpc.id = 123
			return rpc
		},
		onIterable(rpc, next) {
			const method = [rpc.method, rpc.chain?.map(c => c.method)].flat().filter(Boolean).join(".")
			function* _generated() {
				let i = 1
				while (i <= 3) {
					yield i++
				}
			}
			function generatedManual(): Pick<Generator<unknown>, "next"| "return" | "throw"| typeof Symbol.iterator> {
				let i = 1
				return {
					[Symbol.iterator]() {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
						return this
					},
					next(value) {
						if (i > 3) {
							return { value: undefined, done: true }
						}
						return { value: value ?? i++, done: false }
					},
					return(value) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						return { value: value ?? i, done: true }
					},
					throw(error) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						return { value: error, done: true }
					},
				}
			}
			if ("this.is.a.generator" === method) {
				return generatedManual()
			}
			// eslint-disable-next-line @typescript-eslint/require-await
			async function* _asyncGenerated() {
				let i = 1
				while (i <= 3) {
					yield i++
				}
			}
			function asyncGeneratedManual(): Pick<AsyncGenerator<unknown>, "next" | "return" | "throw" | typeof Symbol.asyncIterator> {
				let i = 1
				return {
					[Symbol.asyncIterator]() {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
						return this
					},
					next(value) {
						if (i > 3) {
							return Promise.resolve({ value: undefined, done: true })
						}
						return Promise.resolve({ value: value ?? i++, done: false })
					},
					return(value) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						return Promise.resolve({ value: value ?? i, done: true })
					},
					throw(error) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						return Promise.resolve({ value: error, done: true })
					},
				}
			}
			if ("this.is.an.asyncGenerator" === method) {
				return asyncGeneratedManual()
			}
			return next
		},
	})

	test("Use a keyword method to end a chain", () => {
		expect(given.this.is().a.test().ok.$end()).toEqual({
			id: 123,
			method: "this.is",
			args: [],
			chain: [
				{ method: "a.test", args: [] },
				{ method: "ok.$end", args: [] },
			],
		})
	})

	test("Override a specified method to return a value immediately", async () => {
		expect(given.testing.nonPromise()).toBe("Hello")
		await expect(given.testing.promise()).resolves.toBe("Hello")
		// expect(given.testing.next()).toBe("I'm next!")
	})

	test("a call to a promise method signifies the end of a chain", async () => {
		const testing = given.test.testing("test").test.tested("test")

		expect(testing).toBeInstanceOf(Promise)

		await expect(testing).resolves.toEqual({
			id: 123,
			method: "test.testing",
			args: ["test"],
			chain: [
				{
					method: "test.tested",
					args: ["test"],
				},
			],
		})

		await expect(given.hello("Ted", "Hi!")).resolves.toEqual({
			id: 123,
			method: "hello",
			args: ["Ted", "Hi!"],
		})

		await expect(given.select.from("users").where("id", "=", 1).execute()).resolves.toEqual({
			id: 123,
			method: "select.from",
			args: ["users"],
			chain: [
				{
					method: "where",
					args: ["id", "=", 1],
				},
				{
					method: "execute",
					args: [],
				},
			],
		})

		// promises are proxied first so iterator method names can be used here
		await expect(given.this.is().next()).resolves.toEqual({
			id: 123,
			method: "this.is",
			args: [],
			chain: [
				{
					method: "next",
					args: [],
				},
			],
		})
	})

	test("a call to an iterator method signifies the end of a chain", async () => {
		const iterator1 = given.this.is().a.generator()
		let j = 1
		for (const i of iterator1) {
			expect(i).toEqual(j++)
		}

		const iterator2 = given.this.is().a.generator()
		expect(iterator2.next()).toEqual({ value: 1, done: false })
		expect(iterator2.next()).toEqual({ value: 2, done: false })
		expect(iterator2.next()).toEqual({ value: 3, done: false })
		expect(iterator2.next()).toEqual({ value: undefined, done: true })

		const asyncIterator1 = given.this.is().an.asyncGenerator()
		j = 1
		for await (const rpc of asyncIterator1) {
			expect(rpc).toEqual(j++)
		}

		const asyncIterator2 = given.this.is().an.asyncGenerator()
		await expect(asyncIterator2.next()).resolves.toEqual({ value: 1, done: false })
		await expect(asyncIterator2.next()).resolves.toEqual({ value: 2, done: false })
		await expect(asyncIterator2.next()).resolves.toEqual({ value: 3, done: false })
		await expect(asyncIterator2.next()).resolves.toEqual({ value: undefined, done: true })
	})
})

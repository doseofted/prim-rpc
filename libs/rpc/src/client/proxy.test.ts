/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { expect, test } from "vitest"
import { createMethodCatcher } from "./proxy"

test("RPC proxy creates RPC-like structure, including chains", async () => {
	const given = createMethodCatcher({
		onAwaited(rpc, _next) {
			rpc.id = 123
			return rpc
		},
		onMethod(rpc, next) {
			const keyword = "$end"
			const keywordFound = rpc?.method?.endsWith(keyword) || rpc?.chain?.slice().pop().method.endsWith(keyword)
			if (keywordFound) {
				rpc.id = 123
				return rpc
			}
			if (rpc.method === "testing.nonPromise") {
				return "Hello"
			}
			if (rpc.method === "testing.promise") {
				return new Promise(r => r("Hello"))
			}
			return next
		},
	})

	// in this example, a method `.$end()` is used as a keyword to signify the end of a chain
	expect(given.this.is().a.test().ok.$end()).toEqual({
		id: 123,
		method: "this.is",
		args: [],
		chain: [
			{ method: "a.test", args: [] },
			{ method: "ok.$end", args: [] },
		],
	})

	// in this example, certain methods are overridden to return a value immediately
	expect(given.testing.nonPromise()).toBe("Hello")
	await expect(given.testing.promise()).resolves.toBe("Hello")

	// in these examples, a call to a promise method signifies the end of a chain
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
})

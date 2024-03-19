/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { expect, test } from "vitest"
import { createMethodCatcher } from "./proxy"

test("RPC proxy creates RPC-like structure, including chains", async () => {
	const given = createMethodCatcher(rpc => {
		rpc.id = 123
		// console.log("rpc", rpc)
		return rpc
	})
	// console.log("uhm", await given.test.testing.lol(123).what().test.cool("args"))
	// console.log("async1", JSON.stringify(await given.hi("there").test.what("ever")))

	// console.log("async2", hi.then().then())
	// expect(hi).toBeInstanceOf(Promise)
	// await expect(hi).resolves.toBe({
	// 	id: 123,
	// 	method: "hi",
	// 	args: [],
	// })
	// console.log("what", await given.test.hello("Ted", "Hi!"))

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

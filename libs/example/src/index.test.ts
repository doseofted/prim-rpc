import { expect, test } from "vitest"
import { oops, sayHello, sayHelloAlternative, typeMessage, withCallback } from "./index"

test("should say hello", async () => {
	expect(
		await sayHello({ greeting: "Hey", name: "Ted" }),
	).toBe("Hey Ted!")
})


test("should say hello, using alternate syntax", async () => {
	expect(
		await sayHelloAlternative("Hey", "Ted"),
	).toBe("Hey Ted!")
})


test("oops should throw", () => {
	expect(() => oops()).toThrowError(new Error("My bad."))
})

test("should use callbacks", async () => {
	await new Promise<void>(resolve => {
		const messages: string[] = []
		function cb (message: string) {
			messages.push(message)
			if (messages.length < 2) { return }
			expect(messages).toEqual(["You're using Prim.", "Still using Prim!"])
			resolve()
		}
		withCallback(cb)
	})
})

test("should type hello", async () => {
	await new Promise<void>(resolve => {
		const message = "Hello"
		const letters: string[] = []
		function cb (letter: string) {
			letters.push(letter)
			if (letters.length < message.length) { return }
			expect(letters.join("")).toEqual(message)
			resolve()
		}
		typeMessage(message, cb, 5)
	})
})

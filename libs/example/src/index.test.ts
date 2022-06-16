import { oops, sayHello, sayHelloAlternative, typeMessage, withCallback } from "./index"

it("should say hello", async () => {
	expect(
		await sayHello({ greeting: "Hey", name: "Ted" })
	).toBe("Hey Ted!")
})


it("should say hello, using alternate syntax", async () => {
	expect(
		await sayHelloAlternative("Hey", "Ted")
	).toBe("Hey Ted!")
})


it("oops should throw", () => {
	expect(() => oops()).toThrowError(new Error("My bad."))
})

it("should use callbacks", (done) => {
	const messages: string[] = []
	function cb (message: string) {
		messages.push(message)
		if (messages.length < 2) { return }
		expect(messages).toEqual(["You're using Prim.", "Still using Prim!"])
		done()
	}
	withCallback(cb)
})

it("should type hello", (done) => {
	const message = "Hello"
	const letters: string[] = []
	function cb (letter: string) {
		letters.push(letter)
		if (letters.length < message.length) { return }
		expect(letters.join("")).toEqual(message)
		done()
	}
	typeMessage(message, cb, 5)
})

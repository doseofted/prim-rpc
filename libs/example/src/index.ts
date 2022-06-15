/**
 * This is an example of a module that could be used with Prim (the server, not data manager aspect of the project).
 * Prim is intended to be a content manager but to make development easier, I plan to build a server structure
 * that will be easier to work with when working with dynamic data (as opposed to data given at build time).
 *
 * This is an example and should be used for tests with Prim. This may move to an `example.test.ts` file once
 * a testing framework is setup.
 */

export const you = "Ted"

/**
 * Say hello. A test with an object parameter.
 *
 * @param options Options used for greeting
 * @returns A nice greeting
 */
export async function sayHello (options: { greeting?: string, name?: string }) {
	const { greeting, name } = options
	return `${greeting ?? "Hello"} ${name ?? "you"}!`
}

/**
 * An alternative to `sayHello` that uses positional arguments.
 *
 * @param greeting How should `name` be greeted?
 * @param name What's your name?
 * @returns A nice greeting
 */
export async function sayHelloAlternative(greeting: string, name: string) {
	return `${greeting ?? "Hello"} ${name ?? "you"}!`
}

/**
 * This is an example of an entire that module that might be exported.
 */
export const testLevel1 = {
	sayHello,
	sayHelloAlternative
}

/** A module inside of module. A module turducken. */
export const testLevel2 = { testLevel1 }

/** It throws on purpose. */
export function oops(ok = false) {
	if (!ok) { throw new Error("My bad.") }
	return "I did it again."
}

/** This function makes use of a callback. Sometimes I don't need to be clever. */
export function withCallback(cb: (message: string) => void) {
	cb("You're using Prim.")
	setTimeout(() => {
		cb("Still using Prim!")
	}, 100);
}

/** Type a message. Now with configurable type speed. */
export function typeMessage(message: string, typeLetter: (typed: string) => void, speed = 300) {
	let timeout = 0
	message.split("").forEach(letter => {
		setTimeout(() => {
			typeLetter(letter)
		}, ++timeout * speed);
	})
}

/**
 * This is an example of a module that could be used with Prim (the server, not data manager aspect of the project).
 * Prim is intended to be a content manager but to make development easier, I plan to build a server structure
 * that will be easier to work with when working with dynamic data (as opposed to data given at build time).
 * 
 * This is an example and should be used for tests with Prim. This may move to an `example.test.ts` file once
 * a testing framework is setup.
 */

// SECTION: frontend/backend integration test
// this is for example usage from frontend and backend
export const you = "Ted"
// console.log("Hello", you)
// !SECTION: frontend/backend integration test

/**
 * Say hello.
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
export async function sayHelloAlternative(greeting = "", name = "") {
	return `${greeting || "Hello"} ${name || "you"}!`
}

/**
 * This is an example of an entire that module that might be exported
 */
export const testLevel1 = {
	sayHello,
	sayHelloAlternative
}

export const testLevel2 = { testLevel1 }

export function oops(ok = false) {
	if (!ok) { throw new Error("My bad.") }
	return "I did it again."
}

export function withCallback(cb: (message: string) => void) {
	cb("You're using Prim.")
	setTimeout(() => {
		cb("Still using Prim!")
	}, 5000);
}
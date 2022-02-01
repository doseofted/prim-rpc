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
console.log("Hello", you)
// !SECTION: frontend/backend integration test

export function sayHello (options: { greeting?: string, name?: string }) {
	const { greeting = "", name = "" } = options
	return `${greeting ?? "Hello"} ${name ?? "you"}!`
}

export function sayHelloAlternative(greeting = "", name ="") {
	return `${greeting ?? "Hello"} ${name ?? "you"}!`
}

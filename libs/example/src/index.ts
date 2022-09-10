/**
 * Example library
 * 
 * @packageDocumentation
 * @public
 * 
 * @nonsense Hello
 * @fakeFlag
 */
import * as additional from "./submodule"
// import things, { ThingInstance, Things } from "./things"

/**
 * This is an example of a module that could be used with Prim (the server, not data manager aspect of the project).
 * Prim is intended to be a content manager but to make development easier, I plan to build a server structure
 * that will be easier to work with when working with dynamic data (as opposed to data given at build time).
 *
 * This is an example and should be used for tests with Prim. This may move to an `example.test.ts` file once
 * a testing framework is setup.
 */
export { additional /* things, Things */ }
// export type { ThingInstance }

/**
 * Not me.
 * 
 * @public
 */
export const you = "Ted"

export enum Test { What = 5 }

/** Options used for greeting */
export interface Greeting { greeting?: string, name?: string }
/**
 * Say hello. A test with an object parameter.
 *
 * @param options - Options used for greeting
 * @returns A nice greeting
 * 
 * @public
 */
export function sayHello (options?: Greeting) {
	const { greeting, name } = options ?? {}
	return `${greeting ?? "Hello"} ${name ?? "you"}!`
}
sayHello.rpc = true

/**
 * An alternative to `sayHello` that uses positional arguments.
 *
 * @param greeting - How should `name` be greeted?
 * @param name - What's your name?
 * @returns A nice greeting
 * 
 * @public
 */
export function sayHelloAlternative(greeting: string, name: string) {
	return `${greeting ?? "Hello"} ${name ?? "you"}!`
}

/**
 * This is an example of an entire that module that might be exported.
 * 
 * @public
 */
export const testLevel1 = {
	sayHello,
	sayHelloAlternative,
}

/**
 * A module inside of a module. A module turducken.
 * 
 * @public
 */
export const testLevel2 = {
	testLevel1,
	logMessage(message: string) {
		console.log(message)
	},
}

/**
 * It throws on purpose.
 * 
 * @param ok - Is it okay to fail?
 * @returns A message
 * @throws An error: "My bad."
 * 
 * @public
 */
export function oops(ok = false) {
	if (!ok) { throw new Error("My bad.") }
	return "I did it again."
}

/**
 * This function makes use of a callback. Sometimes I don't need to be clever.
 * 
 * @param cb - Callback to be called with a message
 * 
 * @public
 */
export function withCallback(cb: (message: string) => void) {
	cb("You're using Prim.")
	setTimeout(() => {
		cb("Still using Prim!")
	}, 100)
}

/**
 * Type a message. Now with configurable type speed.
 * 
 * @param message - Message to be typed
 * @param typeLetter - Callback called on each new letter
 * 
 * @public
 */
export function typeMessage(message: string, typeLetter: (typed: string) => void, speed = 300) {
	let timeout = 0
	message.split("").forEach(letter => {
		setTimeout(() => {
			typeLetter(letter)
		}, ++timeout * speed)
	})
}

/**
 * Probably tomorrow.
 * 
 * @param day - Given day
 * 
 * @public
 */
export function whatIsDayAfter (day: Date) {
	return new Date(day.valueOf() + (1000 * 60 * 60 * 24))
}

type AddableThing = number|string
/** Add two numbers */
export function addThings (...things: number[]): number
/** Add two strings */
export function addThings (...things: string[]): string
/** Add two things */
export function addThings (...things: AddableThing[]): AddableThing {
	const unique = new Set(things.map(t => typeof t))
	/** Workaround for function overload... this is just an example */
	const expected = <X>(given: unknown, type: string): given is X => Array.from(unique)[0] === type
	if (unique.size > 1) {
		throw new Error("Does not compute. I mean it does but kinda unpredictable, right?")
	}
	if (expected<string[]>(things, "string")) {
		return things.reduce((p, n) => p + n)
	} else if (expected<number[]>(things, "number")) {
		return things.reduce((p, n) => p + n)
	} else {
		throw new Error("Only strings and numbers are supported. Sincerely sorry.")
	}
}

/**
 * 
 * @param params - Any kind of parameter really
 * @returns The parameters you gave
 * 
 * @public
 */
export default function (...params: unknown[]) {
	return { params: params.length === 1 ? params[0] : params }
}

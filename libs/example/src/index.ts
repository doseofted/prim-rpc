/**
 * Example library
 *
 * @packageDocumentation
 * @public
 *
 * @nonsense Hello
 * @fakeFlag
 */

/**
 * This is an example of a module that could be used with Prim (the server, not data manager aspect of the project).
 * Prim is intended to be a content manager but to make development easier, I plan to build a server structure
 * that will be easier to work with when working with dynamic data (as opposed to data given at build time).
 *
 * This is an example and should be used for tests with Prim. This may move to an `example.test.ts` file once
 * a testing framework is setup.
 */
export * as additional from "./submodule"
// external module directly imported (no RPC property added)
export { startCase } from "lodash-es"

// import things, { ThingInstance, Things } from "./things"
// export type { ThingInstance }

/**
 * Not me.
 *
 * @public
 */
export const you = "Ted"

export enum Test {
	What = 5,
}

/** Options used for greeting */
export interface Greeting {
	greeting?: string
	name?: string
}
/**
 * Say hello. A test with an object parameter.
 *
 * @param options - Options used for greeting
 * @returns A nice greeting
 *
 * @public
 */
export function sayHello(options?: Greeting) {
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
sayHelloAlternative.rpc = true

/**
 * This is an example of an entire that module that might be exported.
 *
 * @public
 */
export const testLevel1 = {
	sayHello,
	sayHelloAlternative,
}

export function logMessage(message: string) {
	console.log(message)
}
logMessage.rpc = true

/**
 * A module inside of a module. A module turducken.
 *
 * @public
 */
export const testLevel2 = {
	testLevel1,
	logMessage,
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
	if (!ok) {
		throw new Error("My bad.")
	}
	return "I did it again."
}
oops.rpc = true

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
withCallback.rpc = true

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
typeMessage.rpc = true

/**
 * Probably tomorrow.
 *
 * @param day - Given day
 *
 * @public
 */
export function whatIsDayAfter(day: Date) {
	return new Date(day.valueOf() + 1000 * 60 * 60 * 24)
}
whatIsDayAfter.rpc = true

type AddableThing = number | string
/** Add two numbers */
export function addThings(...things: number[]): number
/** Add two strings */
export function addThings(...things: string[]): string
/** Add two things */
export function addThings(...things: AddableThing[]): AddableThing {
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
addThings.rpc = true

/** Server-provided details about an imaginary profile. */
export interface ImaginaryProfile {
	name: string
	password: string
	email: string
	picture: File | import("node:buffer").File
}
export function createImaginaryProfile(input: ImaginaryProfile) {
	const { name, email, picture } = input
	console.log(new Date(), "Look, a profile:", { name, email, pictureName: picture.name })
	return true
}
createImaginaryProfile.rpc = true

export type GenericFormExample = Record<string, string | string[] | File | import("node:buffer").File>
export function handleForm(given: GenericFormExample): string[]
/**
 * Upload a form to the server but without all of the hassle. Even with file uploads. What?!
 *
 * @param form - An HTML Form element or Form Data used with the HTML Form
 * @returns The field names as received from the server. Field values are logged server-side.
 */
export function handleForm(form: HTMLFormElement | FormData): string[]
export function handleForm(form: GenericFormExample | HTMLFormElement | FormData): string[] {
	const serverSide = (given: unknown): given is GenericFormExample => typeof window === "undefined"
	if (!serverSide(form)) {
		return []
	}
	console.log("Received form data on server:", form)
	return Object.keys(form)
}
handleForm.rpc = true

export interface FormInputs {
	name: string
	email: string
	message: string
}

/** Server utility to ensure given argument is of type T */
const server = <T>(given: unknown): given is T => typeof window === "undefined"

/** Submit a contact form */
export function submitContactForm(form: HTMLFormElement | FormData): string
export function submitContactForm(inputs: FormInputs): string
export function submitContactForm(inputs: unknown) {
	if (!server<FormInputs>(inputs)) {
		return
	}
	const { name, message, email } = inputs
	console.log("Details to be sent somewhere:", { name, message, email })
	return `Thank you for your message, ${name}!`
}
submitContactForm.rpc = true

/** What's this? What's this? */
export function whatIsThis(this: unknown) {
	console.log("What is this?", "This is", this)
	return { this: !!this }
}
whatIsThis.rpc = true

/**
 * Give me a file and I'll throw it into the void, for free.
 *
 * @param file
 * @returns The file name
 */
export function uploadTheThing(file: File | import("node:buffer").File) {
	const { name, size } = file
	return { name, size }
}
uploadTheThing.rpc = true

/**
 * Make an introduction.
 *
 * @param x Introducee 1
 * @param y Introducee 2
 * @returns An introduction
 */
export function greetings(x: string, y: string) {
	return `${x}, meet ${y}.`
}
greetings.rpc = true

/**
 *
 * @param args - Any kind of argument really
 * @returns The arguments you gave
 *
 * @public
 */
function defaultFunction(...args: unknown[]) {
	return { args: args.length === 1 ? args[0] : args }
}
defaultFunction.rpc = true

export default defaultFunction

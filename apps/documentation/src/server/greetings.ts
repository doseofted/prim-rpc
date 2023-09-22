import { z } from "zod"

/**
 * Make an introduction.
 *
 * @param x Stranger
 * @param y Friend
 * @returns New Friends
 */
export function greetings(x?: string, y?: string) {
	x = z.string().default("Backend").parse(x)
	y = z.string().default("Frontend").parse(y)
	return `${x},\nmeet ${y}.`
}
greetings.rpc = true

/** Our first function */
export function hello(name = "world") {
	return `Hello ${name}!`
}
hello.rpc = true

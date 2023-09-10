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

function defaultFunction() {
	return "Hello from Prim+RPC!"
}
defaultFunction.rpc = true
export default defaultFunction

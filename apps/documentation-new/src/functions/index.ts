import { z } from "zod"

/**
 * Make an introduction.
 *
 * @param x Introducee 1
 * @param y Introducee 2
 * @returns An introduction
 */
export function greetings(x?: string, y?: string) {
	x = z.string().default("Backend").parse(x)
	y = z.string().default("Frontend").parse(y)
	return `${x}, meet ${y}.`
}
greetings.rpc = true

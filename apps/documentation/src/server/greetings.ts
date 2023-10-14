import { z } from "zod"

/**
 * Make an introduction.
 *
 * @param x Stranger
 * @param y Friend
 * @returns New Friends
 */
export function greetings(x?: string, y?: string) {
	;[x, y] = greetings.params.parse([x, y])
	return `${x},\nmeet ${y}.`
}
greetings.params = z.tuple([z.string().default("Backend"), z.string().default("Frontend")])
greetings.rpc = true

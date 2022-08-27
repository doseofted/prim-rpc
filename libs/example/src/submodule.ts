/**
 * Everyone seeks closure. Even developers.
 * 
 * @param prefix - Prefix of console log ran by closure.
 * @returns Closure that logs your message (it's even prefixed)
 * 
 * @public
 */
export function uhOhClosures (prefix: string) {
	return (carefullyCraftedMessage: string)  => {
		console.log(`[${prefix}]:`, carefullyCraftedMessage)
	}
}

/**
 * Can I guess the operation?
 * 
 * @param operate - Callback with an x and y which you should perform an operation on
 * @returns The operation that I think you performed
 * 
 * @public
 */
export async function guessTheOperation (operate: (x: number, y: number) => number|Promise<number>) {
	const x = Math.round(Math.random() * 100)
	const y = Math.round(Math.random() * 100)
	const given = await operate(x, y)
	const possible = new Map([
		[x * y, "multiply"],
		[x / y, "divide"],
		[x + y, "add"],
		[x - y, "subtract"],
	])
	return possible.get(given) ?? "idk"
}

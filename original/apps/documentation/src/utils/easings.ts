/** https://easings.net/#easeOutExpo */
export function easeOutExpo(x: number): number {
	return x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
}

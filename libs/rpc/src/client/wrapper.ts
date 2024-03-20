/**
 * Given object `T` (possibly as a Promise), act on the resolved value in the
 * provided `handler` which should return some value back, which will become the
 * final return value of this function.
 *
 * This is a small utility that should make this pattern play nicer with TypeScript.
 */
export function handlePotentialPromise<
	Given,
	Returned,
	GivenResolved = Given extends Promise<infer Resolved> ? Resolved : Given,
	ReturnedResolved = Returned extends Promise<infer Resolved> ? Resolved : Returned,
	ReturnedFinal = Given extends Promise<infer _>
		? Promise<ReturnedResolved>
		: Returned extends Promise<infer _>
			? Promise<ReturnedResolved>
			: Returned,
>(given: Given, handler: (value: GivenResolved) => Returned): ReturnedFinal {
	if (given instanceof Promise) {
		return given.then(handler) as ReturnedFinal
	}
	return handler(given as unknown as GivenResolved) as unknown as ReturnedFinal
}

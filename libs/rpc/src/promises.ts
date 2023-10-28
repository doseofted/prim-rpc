import { PROMISE_PREFIX } from "./client"
import { extractGivenData, mergeGivenData } from "./extract"

function isPromise(given: unknown) {
	return given instanceof Promise ? given : false
}

export function extractPromiseData(given: unknown): [given: unknown, promises: Record<string, Promise<unknown>>] {
	return extractGivenData(given, isPromise, PROMISE_PREFIX)
}

export function mergePromiseData(given: unknown, promises: Record<string, Promise<unknown>>): unknown {
	return mergeGivenData(given, promises, PROMISE_PREFIX)
}

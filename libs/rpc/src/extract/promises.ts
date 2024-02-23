import { PROMISE_PREFIX } from "../constants"
import { featureFlags } from "../flags"
import { extractGivenData, mergeGivenData } from "./base"

function isPromise(given: unknown) {
	return given instanceof Promise ? given : false
}

export function extractPromiseData(given: unknown): [given: unknown, promises: Record<string, Promise<unknown>>] {
	if (!featureFlags.supportPromises) return [given, {}]
	return extractGivenData(given, isPromise, PROMISE_PREFIX)
}

/* export async function resolveExtractedPromises<T = unknown>(promises: Record<string, Promise<T>>) {
	const resolvedRecord: Record<string, T> = {}
	await Promise.allSettled(Object.values(promises))
	Object.entries(promises).forEach(async ([key, promise]) => {
		try {
			resolvedRecord[key] = await promise
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			resolvedRecord[key] = error
		}
	})
	return resolvedRecord
} */

export function mergePromiseData(given: unknown, promises: Record<string, Promise<unknown>>): unknown {
	if (!featureFlags.supportPromises) return given
	console.log("SO CLOSE 2", given, promises)
	const merged = mergeGivenData(given, promises, PROMISE_PREFIX)
	return merged
}

function isPromisePlaceholder(given: unknown) {
	return typeof given === "string" && given.startsWith(PROMISE_PREFIX) ? given : false
}

/** Take Promise placeholders from a server-given result and turn those into real Promises */
export function extractPromisePlaceholders(
	given: unknown,
	cb?: (promiseId: string, resolve: (given: unknown) => void) => void
): unknown {
	if (!featureFlags.supportPromises) return given
	console.log("SO CLOSE 1", given)
	const [value, extracted] = extractGivenData(given, isPromisePlaceholder, PROMISE_PREFIX)
	console.log("SO CLOSE 1.5", value, extracted)
	const extractedTransformed: Record<string, Promise<unknown>> = {}
	for (const [replacedKey, originalKey] of Object.entries(extracted)) {
		extractedTransformed[replacedKey] = new Promise(resolve => {
			cb?.(originalKey, resolve)
		})
	}
	console.log("SO CLOSE 3", extractedTransformed)
	const givenWithPromises = mergePromiseData(given, extractedTransformed)
	console.log("SO CLOSE 4", givenWithPromises)
	return givenWithPromises
}

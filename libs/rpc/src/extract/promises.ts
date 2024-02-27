// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { PROMISE_PREFIX } from "../constants"
import { featureFlags } from "../flags"
import { extractGivenData, mergeGivenData } from "./base"

function isPromise(given: unknown) {
	return given instanceof Promise ? given : false
}

export function extractPromiseData(
	given: unknown,
	enabled = featureFlags.supportMultiplePromiseResults
): [given: unknown, promises: Record<string, Promise<unknown>>] {
	if (!enabled) return [given, {}]
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

function mergePromiseData(given: unknown, promises: Record<string, Promise<unknown>>): unknown {
	return mergeGivenData(given, promises, PROMISE_PREFIX)
}

function isPromisePlaceholder(given: unknown) {
	return typeof given === "string" && given.startsWith(PROMISE_PREFIX) ? given : false
}

/** Take Promise placeholders from a server-given result and turn those into real Promises */
export function extractPromisePlaceholders(
	given: unknown,
	cb?: (promiseId: string, resolve: (given: unknown) => void) => void,
	enabled = featureFlags.supportMultiplePromiseResults
): unknown {
	if (!enabled) return given
	const [_, extracted] = extractGivenData(given, isPromisePlaceholder, PROMISE_PREFIX)
	const extractedTransformed: Record<string, Promise<unknown>> = {}
	for (const [replacedKey, originalKey] of Object.entries(extracted)) {
		extractedTransformed[replacedKey] = new Promise(resolve => {
			cb?.(originalKey, resolve)
		})
	}
	return enabled ? mergePromiseData(given, extractedTransformed) : given
}

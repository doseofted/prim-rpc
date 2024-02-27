// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { nanoid } from "nanoid"
import type { UniqueTypePrefix } from "../interfaces"

/**
 * Extract given type `T` from any given argument (object/array/primitive) to form `Record<string, T>`.
 * This is not recursive due to potential performance issues with deeply nested large objects.
 * However, recursion to a limited depth may be added in future if necessary or useful.
 *
 * This can be undone by `mergeGivenData()`.
 *
 * @param given - The given argument to extract from
 * @param extractMatches - A function that matches the extracted type against argument and returns that back only if test is passed
 * @param prefix - A prefix to use for the identifier in returned record
 * @returns A tuple of the given argument with transformations and a record of extracted data
 */
export function extractGivenData<Extract = unknown>(
	given: unknown,
	extractMatches: (given: unknown) => Extract,
	prefix: UniqueTypePrefix
): [given: unknown, extracted: Record<string, Exclude<Extract, false>>] {
	const extractedRecord: Record<string, Exclude<Extract, false>> = {}
	const extracted = extractMatches(given)
	// extracted type was given directly
	if (extracted) {
		const identifier = [prefix, nanoid()].join("")
		extractedRecord[identifier] = extracted as Exclude<Extract, false>
		return [identifier, extractedRecord]
	}
	// extracted type may possibly be inside of an object
	if (typeof given === "object") {
		for (const [key, val] of Object.entries(given)) {
			const valBinary = extractMatches(val)
			if (valBinary) {
				const binaryIdentifier = [prefix, nanoid()].join("")
				given[key] = binaryIdentifier
				extractedRecord[binaryIdentifier] = valBinary as Exclude<Extract, false>
			} else if (Array.isArray(val)) {
				// maybe multiple extracted types were given
				const [replacedVal, moreBlobs] = extractGivenData(val, extractMatches, prefix)
				given[key] = replacedVal
				for (const [blobKey, blob] of Object.entries(moreBlobs)) {
					extractedRecord[blobKey] = blob
				}
			}
		}
		if (Object.keys(extractedRecord).length > 0) {
			return [given, extractedRecord]
		}
	}
	// extracted type may be inside of an array
	if (Array.isArray(given)) {
		const replaced = given.map(val => {
			const valBinary = extractMatches(val)
			if (valBinary) {
				const binaryIdentifier = [prefix, nanoid()].join("")
				extractedRecord[binaryIdentifier] = valBinary as Exclude<Extract, false>
				return binaryIdentifier
			}
			return val as unknown
		})
		if (Object.keys(extractedRecord).length > 0) {
			return [replaced, extractedRecord]
		}
	}
	return [given, extractedRecord]
}

/**
 * Given some object transformed with `extractGivenData()`, merge the extracted data back into the object.
 *
 * @param given The given object to merge extracted data back into
 * @param extracted The extracted objects need to become merged back into the given object
 * @param prefix The prefix used for the identifier in the extracted record
 * @returns The merged object
 */
export function mergeGivenData<Extract = unknown>(
	given: unknown,
	extracted: Record<string, Extract>,
	prefix: UniqueTypePrefix
): unknown {
	if (typeof given === "string" && given.startsWith(prefix)) {
		return extracted[given] ?? given
	}
	if (typeof given === "object") {
		for (const [key, val] of Object.entries(given)) {
			if (typeof val === "string" && val.startsWith(prefix)) {
				given[key] = extracted[val] ?? val
			} else if (Array.isArray(val)) {
				const newVal = mergeGivenData(val, extracted, prefix)
				given[key] = newVal
			}
		}
		return given as unknown
	}
	if (Array.isArray(given)) {
		return given.map(given => {
			if (typeof given === "string" && given.startsWith(prefix)) {
				return extracted[given] ?? given
			}
			return given as unknown
		})
	}
	return given
}

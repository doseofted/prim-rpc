// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { nanoid } from "nanoid"
import { BLOB_PREFIX } from "./client"

/**
 * Helper to get entries from given the form as a record
 * (which can then be used to get Blobs)
 */
function handlePossibleForm(form: HTMLFormElement | FormData) {
	const formData = form instanceof HTMLFormElement ? new FormData(form) : form
	const data: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {}
	// NOTE: not using `Object.fromEntries(formData.entries())` because inputs with multiple values aren't utilized
	formData.forEach((val, key) => {
		if (data[key]) {
			const previous = data[key]
			if (Array.isArray(previous)) {
				previous.push(val)
			} else {
				data[key] = [previous, val]
			}
		} else {
			data[key] = val
		}
	})
	return data
}

/**
 * Given a Blob, return an identifier. If given an object or an array,
 * search those structures for a Blob and return the object with Blobs replaced
 * by an identifier.
 *
 * **Note:** only top-level Blobs are inspected in given structure for performance in
 * large, deeply nested request bodies.
 *
 * Additionally, the separated Blobs will be given as a second return value where each key is the
 * identifier used and the value is the Blob itself.
 *
 * @param given - The given object containing a blob. It could be a form element/data that contains blobs
 *   or it could be a regular object that contains blobs.
 * @param fromForm - It is important for Prim Client to use data from a given form element even if blobs
 *   are not given. This is used in recursive calls to determine if given element is a form element/data
 */
export function handlePossibleBlobs(
	given: unknown,
	fromForm = false
): [given: unknown, blobs: Record<string, Blob | Buffer>, fromForm: boolean] {
	const blobs: Record<string, Blob | Buffer> = {}
	const isBinaryLike = (possiblyBin: unknown) =>
		(typeof Blob !== "undefined" && possiblyBin instanceof Blob) ||
		(typeof Buffer !== "undefined" && possiblyBin instanceof Buffer)
			? possiblyBin
			: false
	const binaryGiven = isBinaryLike(given)
	const givenForm = (maybeForm: unknown): maybeForm is HTMLFormElement | FormData =>
		(typeof HTMLFormElement === "function" && maybeForm instanceof HTMLFormElement) ||
		(typeof FormData === "function" && maybeForm instanceof FormData)
	if (givenForm(given)) {
		// form was given that possibly contains blobs
		const newGiven = handlePossibleForm(given)
		return handlePossibleBlobs(newGiven, true)
	}
	if (binaryGiven) {
		// blob was given directly
		const binaryIdentifier = [BLOB_PREFIX, nanoid()].join("")
		blobs[binaryIdentifier] = binaryGiven
		return [binaryIdentifier, blobs, fromForm]
	}
	if (typeof given === "object") {
		for (const [key, val] of Object.entries(given)) {
			// possibly given from form data
			const valBinary = isBinaryLike(val)
			if (valBinary) {
				const binaryIdentifier = [BLOB_PREFIX, nanoid()].join("")
				given[key] = binaryIdentifier
				blobs[binaryIdentifier] = valBinary
			} else if (Array.isArray(val)) {
				// maybe multiple files were given in form data
				const [replacedVal, moreBlobs] = handlePossibleBlobs(val)
				given[key] = replacedVal
				for (const [blobKey, blob] of Object.entries(moreBlobs)) {
					blobs[blobKey] = blob
				}
			}
		}
		if (Object.keys(blobs).length > 0) {
			return [given, blobs, fromForm]
		}
	}
	if (Array.isArray(given) && given.filter(a => a instanceof Blob).length > 0) {
		// list of blobs given
		const replaced = given.map(val => {
			const valBinary = isBinaryLike(val)
			if (valBinary) {
				const binaryIdentifier = [BLOB_PREFIX, nanoid()].join("")
				blobs[binaryIdentifier] = valBinary
				return binaryIdentifier
			}
			return val as unknown
		})
		return [replaced, blobs, fromForm]
	}
	return [given, blobs, fromForm]
}

/**
 * When given a structure (`given`), search it for blob identifiers and then replace
 * each identifier with the given Blob-like object (maybe Buffer, maybe another string reference, etc.)
 * given by `blobs`.
 *
 * **Note:** only top-level Blobs are inspected in given structure for performance in
 * large, deeply nested request bodies.
 *
 * This undoes `handlePossibleBlobs()`.
 */
export function mergeBlobLikeWithGiven(given: unknown, blobs: Record<string, unknown>): unknown {
	if (typeof given === "string" && given.startsWith(BLOB_PREFIX)) {
		return blobs[given] ?? given
	}
	if (typeof given === "object") {
		for (const [key, val] of Object.entries(given)) {
			if (typeof val === "string" && val.startsWith(BLOB_PREFIX)) {
				given[key] = blobs[val] ?? val
			} else if (Array.isArray(val)) {
				const newVal = mergeBlobLikeWithGiven(val, blobs)
				given[key] = newVal
			}
		}
		return given as unknown
	}
	if (Array.isArray(given)) {
		return given.map(given => {
			if (typeof given === "string" && given.startsWith(BLOB_PREFIX)) {
				return blobs[given] ?? given
			}
			return given as unknown
		})
	}
	return given
}

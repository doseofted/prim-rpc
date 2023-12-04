// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { BLOB_PREFIX } from "../constants"
import { extractGivenData, mergeGivenData } from "./base"

/**
 * Determine if given argument is a Blob or File (universal) or Buffer (Node)
 *
 * @param possiblyBinary - Maybe a binary-like object
 * @returns The binary given, otherwise `false`
 */
function isBinaryLike(possiblyBinary: unknown) {
	return (typeof Blob !== "undefined" && possiblyBinary instanceof Blob) ||
		(typeof Buffer !== "undefined" && possiblyBinary instanceof Buffer)
		? possiblyBinary
		: false
}

/**
 * Determine if given argument is form-like
 *
 * @param maybeForm - FormData, FormElement containing FormData, or SubmitEvent (whose target is a FormElement with FormData)
 * @returns Boolean if given is a form-like object
 */
function givenFormLike(maybeForm: unknown): maybeForm is HTMLFormElement | FormData | SubmitEvent {
	return (
		(typeof HTMLFormElement === "function" && maybeForm instanceof HTMLFormElement) ||
		(typeof FormData === "function" && maybeForm instanceof FormData) ||
		(typeof SubmitEvent === "function" && maybeForm instanceof SubmitEvent)
	)
}

/**
 * Turn `FormData` into an object of a similar structure. Given a form-like
 * object that can be used to reference `FormData`, extract the data from it
 * into an object. If given a `SubmitEvent`, prevent page navigation since the
 * event should be handled by this library.
 */
function handlePossibleForm(form: HTMLFormElement | FormData | SubmitEvent) {
	if (form instanceof SubmitEvent && form.target instanceof HTMLFormElement) {
		form.preventDefault()
	}
	const formData =
		form instanceof HTMLFormElement
			? new FormData(form)
			: form instanceof SubmitEvent
			? form.target instanceof HTMLFormElement
				? new FormData(form.target)
				: undefined
			: form
	const data: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {}
	for (const [key, val] of formData) {
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
	}
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
export function extractBlobData(
	given: unknown,
	fromForm = false
): [given: unknown, blobs: Record<string, Blob | Buffer>, fromForm: boolean] {
	// form was given that possibly contains blobs
	if (givenFormLike(given)) {
		const newGiven = handlePossibleForm(given)
		return extractBlobData(newGiven, true)
	}
	// now we can extract the blobs
	const [newlyGiven, blobs] = extractGivenData(given, isBinaryLike, BLOB_PREFIX)
	return [newlyGiven, blobs, fromForm]
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
export function mergeBlobData(given: unknown, blobs: Record<string, Blob | Buffer>): unknown {
	return mergeGivenData(given, blobs, BLOB_PREFIX)
}

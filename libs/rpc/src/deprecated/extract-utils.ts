// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { RpcPlaceholder, resolvePlaceholder } from "../constants"
import { featureFlags } from "../flags"
import { extract, merge } from "../extract/base"
import { blobIdentifier, givenFormLike, handlePossibleForm } from "../extract/blobs"
import { promiseIdentifier } from "../extract/promises"

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
 *
 * @deprecated
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
	const [blobs, newlyGiven] = extract<Blob | Buffer>(given, blobIdentifier, { iterate: { modifyInPlace: true } })
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
 *
 * @deprecated
 */
export function mergeBlobData(given: unknown, blobs: Record<string, Blob | Buffer>): unknown {
	return merge(blobs, given, { prefixRequired: RpcPlaceholder.BinaryPrefix, iterate: { modifyInPlace: true } })
}

/** @deprecated */
export function extractPromiseData(
	given: unknown,
	enabled = featureFlags.supportMultiplePromiseResults
): [given: unknown, promises: Record<string, Promise<unknown>>] {
	if (!enabled) return [given, {}]
	const [promises, modified] = extract<Promise<unknown>>(given, promiseIdentifier, { iterate: { modifyInPlace: true } })
	return [modified, promises]
}

/** @deprecated */
function mergePromiseData(given: unknown, promises: Record<string, Promise<unknown>>): unknown {
	return merge<Promise<unknown>>(promises, given, {
		prefixRequired: RpcPlaceholder.PromisePrefix,
		iterate: { modifyInPlace: true },
	})
}

/** @deprecated */
function isPromisePlaceholder(given: unknown) {
	return typeof given === "string" && given.startsWith(resolvePlaceholder(RpcPlaceholder.PromisePrefix))
		? RpcPlaceholder.PromisePrefix
		: null
}

/**
 * Take Promise placeholders from a server-given result and turn those into real Promises
 *
 * @deprecated
 */
export function extractPromisePlaceholders(
	given: unknown,
	cb?: (promiseId: string, resolve: (given: unknown) => void) => void,
	enabled = featureFlags.supportMultiplePromiseResults
): unknown {
	if (!enabled) return given
	const [extracted] = extract<string>(given, isPromisePlaceholder)
	const extractedTransformed: Record<string, Promise<unknown>> = {}
	for (const [replacedKey, originalKey] of Object.entries(extracted)) {
		extractedTransformed[replacedKey] = new Promise(resolve => {
			cb?.(originalKey, resolve)
		})
	}
	return enabled ? mergePromiseData(given, extractedTransformed) : given
}

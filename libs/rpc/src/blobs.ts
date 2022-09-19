import { nanoid } from "nanoid"
import { BLOB_PREFIX } from "./client"

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
 */
export function handlePossibleBlobs(given: unknown): [given: unknown, blobs: Record<string, Blob>] {
	const blobs: Record<string, Blob> = {}
	const binaryGiven = given instanceof Blob ? given : false
	if (binaryGiven) { // blob was given directly
		const binaryIdentifier = [BLOB_PREFIX, nanoid()].join("")
		blobs[binaryIdentifier] = binaryGiven
		return [binaryIdentifier, blobs]
	}
	if (typeof given === "object") {
		for (const [key, val] of Object.entries(given)) { // possibly given from form data
			if (val instanceof Blob) {
				const binaryIdentifier = [BLOB_PREFIX, nanoid()].join("")
				given[key] = binaryIdentifier
				blobs[binaryIdentifier] = val
			} else if (Array.isArray(val)) { // maybe multiple files were given in form data
				const [replacedVal, moreBlobs] = handlePossibleBlobs(val)
				given[key] = replacedVal
				for (const [blobKey, blob] of Object.entries(moreBlobs)) {
					blobs[blobKey] = blob
				}
			}
		}
		if (Object.keys(blobs).length > 0) {
			return [given, blobs]
		}
	}
	if (Array.isArray(given) && given.filter(a => a instanceof Blob).length > 0) { // list of blobs given
		const replaced = given.map(val => {
			if (val instanceof Blob) {
				const binaryIdentifier = [BLOB_PREFIX, nanoid()].join("")
				blobs[binaryIdentifier] = val
				return binaryIdentifier
			}
			return val as unknown
		})
		return [replaced, blobs]
	}
	return [given, blobs]
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

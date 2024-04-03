// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import defu from "defu"
import safeSet from "just-safe-set"
import safeGet from "just-safe-get"

interface IterateOptions {
	/**
	 * When `false`, use structured clone of object. When `true` modify given object directly.
	 *
	 * @default false
	 */
	modifyInPlace?: boolean
	/**
	 * Maximum depth to search for values
	 *
	 * @default 3
	 */
	maxDepth?: number
	/**
	 * Arrays can be excluded from search when `true` (with array passed directly to `replacer()` instead).
	 * Array items are included when `false`.
	 *
	 * @default false
	 */
	noArrays?: boolean
	/**
	 * Objects can be excluded from search when `true` (with object passed directly to `replacer()` instead).
	 * Object properties are included when `false`.
	 *
	 * @default false
	 */
	noObjects?: boolean
	/** Internal options for recursion on object */
	recursion?: {
		depth?: number
		key?: string[]
	}
}
const iterateDefaults: IterateOptions = {
	modifyInPlace: false,
	noArrays: false,
	maxDepth: 3,
	recursion: {
		depth: 0,
		key: [],
	},
}

/**
 * Iterate over a JavaScript object `given` recursively and replace values in it with the return value of the given
 * `replacer()`. This is useful for replacing/extracting values inside of an object. Object properties and arrays will
 * be iterated on up to the given `options.maxDepth` (default 3). By default, the object will be cloned (using the
 * structured cloning algorithm) but this can be changed by setting `options.modifyInPlace` to `true`. The returned
 * JavaScript object will be modified according to `replacer()`.
 *
 * @param given Some JavaScript object
 * @param replacer Callback with some value of `given` as an argument that returns a new value for it
 * @param options Recursion options
 * @returns The modified JavaScript object
 *
 * @example ```ts
 * const original = { a: [1, 2, "3"], b: { c: 1, d: ["2"], e: 3 } }
 * const modified = iterate(original, (given, _key) => typeof given === "string" ? parseInt(given) : given)
 * const expected = { a: [1, 2, 3], b: { c: 1, d: [2], e: 3 } }
 * expect(modified).toEqual(expected)
 * ```
 */
export function iterate<Given>(
	given: Given,
	replacer: (given: unknown, key?: string[]) => unknown,
	options: IterateOptions = {}
): Given {
	const depth = options.recursion?.depth ?? 0
	const previousKey = options.recursion?.key ?? []
	options = depth > 0 ? options : defu<IterateOptions, IterateOptions[]>(options, iterateDefaults)
	const modified = options.modifyInPlace || depth > 1 ? given : structuredClone(given)
	if (depth > options.maxDepth) return modified
	const isNonEmptyArray = Array.isArray(modified) && modified.length > 0
	const objectEntries = !isNonEmptyArray && typeof modified === "object" && Object.entries(modified)
	const isNonEmptyObject = objectEntries && objectEntries.length > 0
	if (isNonEmptyArray) {
		if (options.noArrays) return replacer(modified, previousKey) as Given
		for (let index = 0; index < modified.length; index++) {
			const recursion = { depth: depth + 1, key: previousKey.concat(index.toString()) }
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			modified[index] = iterate(modified[index], replacer, { ...options, recursion }) ?? modified[index]
		}
		return modified
	} else if (isNonEmptyObject) {
		if (options.noObjects) return replacer(modified, previousKey) as Given
		for (const [key, val] of Object.entries(modified)) {
			const recursion = { depth: depth + 1, key: previousKey.concat(key) }
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			modified[key] = iterate(val, replacer, { ...options, recursion }) ?? val
		}
		return modified
	}
	return replacer(modified, previousKey) as Given
}

type ExtractOptions = {
	/**
	 * If `keyGeneration()` is left as default method, this is the prefix used for each generated key.
	 *
	 * @default "ext"
	 */
	keyPrefix?: string
	/**
	 * Method of generating a key for extracted object. The returned key may be any value but should be unique.
	 *
	 * `included` is the string value given by `include()` that may be expected to be used as a prefix.
	 * If not given, the default `prefix` should be used instead.
	 *
	 * For optimization with `merge()`, the key should have a prefix `_${name}_` followed by a period-separated path
	 * of where the key was extracted (provided as an argument of key generation). This allows quick lookup of the
	 * the path where values should be inserted.
	 */
	keyGeneration?: (included: string, keys: string[], prefix?: string) => string
	/** Options for iteration on given object */
	iterate?: IterateOptions
}
const keyPrefix = "ext"
const extractDefaults: ExtractOptions = {
	keyPrefix,
	keyGeneration: (included, keys, prefix = keyPrefix) => {
		return ["_", typeof included === "string" ? included : prefix, "_", keys.join(".")].join("")
	},
	iterate: iterateDefaults,
}

/**
 * Extract values from a JavaScript object `given` that pass the `include()` callback. The extracted values are returned
 * alongside the modified object `given`.
 *
 * By default, keys will be generated in a format that is easily understood by and optimized for `merge()` (function
 * that undoes this function, `extract()`). Key generation can be overridden as needed in options.
 *
 * @param given Some JavaScript object
 * @param include Callback that returns truthy if given value should be extracted from `given` object
 * @param options Options for extraction of given values
 * @returns Tuple of (1) extracted values and (2) modified object `given`
 */
export function extract<Extracted = unknown, Given = unknown>(
	given: Given,
	include: (given: unknown) => string | null | undefined,
	options: ExtractOptions = {}
) {
	const extracted: Record<string, Extracted> = {}
	options = defu<ExtractOptions, ExtractOptions[]>(options, extractDefaults)
	const modified = iterate(
		given,
		(given: Extracted, keys) => {
			const included = include(given)
			if (included) {
				const id = options.keyGeneration(included, keys, options.keyPrefix)
				extracted[id] = given
				return id
			}
			return given
		},
		options.iterate
	)
	return [extracted, modified] as const
}

type MergeOptions = {
	/**
	 * By default, all extracted keys will be merged back into object where possible regardless of the prefix given in the
	 * identifier of the key. This can be changed by setting this option. Only keys with the given prefix  will be merged.
	 * Note that this is intended to work with the default `replaceKey()` method.
	 */
	prefixRequired?: string | null
	/**
	 * If identifiers in extracted object include paths from which values were extracted,
	 * this callback can be used for optimized merging.
	 *
	 * By default, this callback will look for some identifier `_${name}_a.b.c` where `_${name}_` is a special marker
	 * (and `name` can be any string) and `a.b.c` is the property path on the object. The `a.b.c` portion will be used
	 * to lookup and replace the given value in the object.
	 *
	 * Set to `false` if an optimized merge should not be attempted.
	 */
	replaceKey?: false | ((identifier: string) => [prefix: string, path: string] | null | undefined)
	/** Options for iteration on given object */
	iterate?: IterateOptions
}
const mergeDefaults: MergeOptions = {
	replaceKey: identifier => {
		const matches = identifier.match(/^_(.+)_(.+)?$/)?.slice(1)
		if (matches.length === 2) return [matches[0], matches[1]]
	},
	iterate: iterateDefaults,
}

/**
 * Merge extracted values into given and return the modified object.
 *
 * @param extracted A key/value pair of where keys are placeholders in `given` and values will be inserted into `given`
 * @param given An object for which `extracted` values should be inserted
 * @param options Options for merging extracted data back into given
 * @returns Given object, modified with values of extracted
 */
export function merge<Extracted = unknown, Given = unknown>(
	extracted: Record<string, Extracted>,
	given: Given,
	options: MergeOptions = {}
) {
	options = defu<MergeOptions, MergeOptions[]>(options, mergeDefaults)
	// first, try an optimized merge
	if (options.replaceKey) {
		const modifiedOptimized = options.iterate.modifyInPlace ? given : structuredClone(given)
		const extractedEntries = Object.entries(extracted)
		const extractGoal = extractedEntries.length
		let extractCompleted = 0
		for (const [identifier, value] of extractedEntries) {
			const [prefix, objectPath] = options.replaceKey(identifier)
			if (options.prefixRequired && prefix !== options.prefixRequired) continue
			if (!objectPath) continue
			if (objectPath.length > options.iterate.maxDepth) continue
			if (safeGet(modifiedOptimized, objectPath)) safeSet(modifiedOptimized, objectPath, value)
			extractCompleted += 1
		}
		if (extractCompleted === extractGoal) return modifiedOptimized
	}
	// if that didn't complete successfully, iterate on object and merge manually
	const modified = iterate(
		given,
		given => {
			if (typeof given === "string" && extracted[given]) {
				if (options.replaceKey && options.prefixRequired) {
					const [prefix] = options.replaceKey(given)
					if (prefix === options.prefixRequired) return extracted[given]
				} else if (!options.prefixRequired || (options.prefixRequired && given.startsWith(options.prefixRequired))) {
					return extracted[given]
				}
			}
			return given
		},
		options.iterate
	)
	return modified
}

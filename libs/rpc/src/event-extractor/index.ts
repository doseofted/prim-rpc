import { castToOpaque, type Opaque } from "emery";
import { isPlainObject } from "es-toolkit";
import { set as setProperty } from "es-toolkit/compat";
import { castToEventId, type EventId, IdGenerator } from "./id-generator";

/**
 * Given an object with properties that are not directly serializable,
 * specifically those that emit events (including promises, iterators, and
 * functions), extract those properties and replace them with unique IDs. This
 * class can work with the value directly or work with an object that contains
 * such values.
 *
 * These types of values could be serialized directly all-at-once in some cases
 * but doing so would either be unsafe (serializing a function and its body
 * would expose logic that shouldn't be shared) or defeat the purpose of the
 * object (we await or iterate values over time, not all-at-once).
 *
 * The intent of this class is not to decide how those extracted objects should
 * be serialized but to extract them and assign unique IDs to properties of the
 * original object, recursively. The purpose of this class is not serialize
 * values unsupported by JSON (a separate serialization library may be used for
 * this purpose) but instead to extract objects that are only useful based on
 * events that occur on them over time.
 *
 * This may include additional, custom types that either emit events or would
 * be expensive or difficult to serialize all-at-once. For example, support for
 * File/Blob objects could be added so that these large extracted objects could
 * be serialized separately and sent as a stream of events rather than
 * all-at-once (even though the objects themselves aren't "eventful").
 */
export class EventExtractor {
	#recursiveDepth: number;
	#recurseIntoArrays: boolean;

	#maintainReferences: boolean;

	#replaceCyclical: boolean;

	constructor(
		/**
		 * By default, only the provided value, top-level object, or array is
		 * processed, not nested values (recursion depth of 1). This recursion depth
		 * can be changed or toggled on (depth of `Infinity`) or off (`0` depth).
		 */
		recursive: RecursionOptions = 1,
		/**
		 * By default, every reference to a supported type extracted from an object
		 * will result in a new unique identifier for that value. By maintaining
		 * references, previously extracted values will be checked against found
		 * values and if they are the same instance, they will receive the same
		 * identifier.
		 *
		 * **Important:** if references are maintained, this list also should be
		 * destroyed when it's no longer needed with the `destroy()` method or by
		 * `using` the created class instance.
		 */
		maintainReferences = false,
		/**
		 * If, when extracting types from the object, a reference is found in the
		 * object, replace that reference with an ID referencing the path of the
		 * referenced value rather than attempting to extract values again.
		 *
		 * This is similar to `maintainReferences` but includes not just supported
		 * types but any reference found in the object.
		 *
		 * If this option is disabled, the `recursive` option should limit the depth
		 * of recursion to avoid infinite loops.
		 */
		replaceCyclical = false,
	) {
		this.#recursiveDepth =
			typeof recursive === "object"
				? boolToDepth(recursive.depth)
				: boolToDepth(recursive);
		if (!replaceCyclical && this.#recursiveDepth === Infinity) {
			throw new Error(
				"Cyclical references must be replaced when recursive depth is infinite",
			);
		}
		this.#recurseIntoArrays =
			typeof recursive === "object" ? (recursive.arrays ?? true) : true;
		this.#maintainReferences = maintainReferences;
		this.#replaceCyclical = replaceCyclical;
	}

	#extractedReferences: ExtractedReferencesOpaque = new Map();

	#replaceReference(
		original: unknown,
		path: PropertyKey[],
	): false | ReferencedValueId {
		const saveReferences = this.#maintainReferences;
		const hasReference = this.#extractedReferences.has(original);
		const savedId = hasReference && this.#extractedReferences.get(original);
		if (saveReferences && savedId) {
			const { prefix } = extractReferenceValueIdParts(savedId);
			const newId = createReferencedValueId(prefix, path);
			// Update the reference with the new path-specific ID
			this.#extractedReferences.set(original, newId);
			return newId;
		}
		for (const supportedType of this.#supportedTypes) {
			const isMatch = supportedType.isMatch(original);
			if (!isMatch) break;
			const newId = createReferencedValueId(isMatch, path);
			if (saveReferences) {
				this.#extractedReferences.set(original, newId);
			}
			return newId;
		}
		return false;
	}

	#cyclicalPrefix = "c";
	/**
	 * A cyclical type is unique from any other supported type because it
	 * determines how values are extracted and merged
	 */
	#cyclicalType: IdGenerator = new IdGenerator(
		this.#cyclicalPrefix,
		() => true,
	);
	#cyclicalReferences: CyclicalReferences = new Map();
	#extractedCyclicalReferences: ExtractedCyclicalReferencesOpaque = new Map();

	/**
	 * Recursively creates a clean copy of an object, replacing any references
	 * to objects in the cyclical map with placeholder values.
	 */
	#createCircularPlaceholders(
		provided: unknown,
		cyclical: CyclicalReferences,
		visited: Set<unknown> = new Set(),
	): unknown {
		/** Replace circular references with a placeholder (to be replaced later) */
		const circularPlaceholder = this.#cyclicalPrefix;
		// Replace visited objects with placeholder to break infinite loops
		if (visited.has(provided)) {
			return circularPlaceholder;
		}
		if (isPlainObject(provided)) {
			visited.add(provided);
			let placeholderNeeded = false;
			const cleanEntries = Object.entries(provided).map(([key, value]) => {
				// Only replace object/array values that are in the cyclical map
				// Primitive values should never be in the cyclical map
				const hasCyclical = cyclical.has(value);
				const isObjectOrArray =
					hasCyclical && (isPlainObject(value) || Array.isArray(value));
				if (hasCyclical && isObjectOrArray) {
					placeholderNeeded = true;
					return [key, circularPlaceholder];
				}
				return [
					key,
					this.#createCircularPlaceholders(value, cyclical, visited),
				];
			});
			visited.delete(provided);
			const clean = placeholderNeeded
				? Object.fromEntries(cleanEntries)
				: provided;
			return clean;
		}
		if (Array.isArray(provided)) {
			visited.add(provided);
			let placeholderNeeded = false;
			const clean = provided.map((item) => {
				// Only replace object/array items that are in the cyclical map
				const hasCyclical = cyclical.has(item);
				const isObjectOrArray =
					hasCyclical && (isPlainObject(item) || Array.isArray(item));
				if (hasCyclical && isObjectOrArray) {
					placeholderNeeded = true;
					return circularPlaceholder;
				}
				return this.#createCircularPlaceholders(item, cyclical, visited);
			});
			visited.delete(provided);
			return placeholderNeeded ? clean : provided;
		}
		// return all other types as-is
		return provided;
	}

	#createCyclicalMappedItem(
		extracted: ReplacedReferencesOpaque,
		originalPath: PropertyKey[],
		referencedPath: PropertyKey[],
		originalObject: unknown,
		cyclical: CyclicalReferences,
	): { id: ReferencedValueId; referencedId: ReferencedValueId } | false {
		const saveReferences = this.#replaceCyclical;
		const savedCyclicalReference =
			this.#extractedCyclicalReferences.has(originalObject);
		const savedId =
			savedCyclicalReference &&
			this.#extractedCyclicalReferences.get(originalObject);
		if (savedId) {
			const { prefix } = extractReferenceValueIdParts(savedId.refId);
			const cyclicalReferenceOriginal = this.#cyclicalType.isMatch(null);
			if (!cyclicalReferenceOriginal) return false;
			const newId = createReferencedValueId(prefix, originalPath);
			// Update the reference with the new path-specific ID
			this.#extractedCyclicalReferences.set(originalObject, savedId);
			return { id: newId, referencedId: savedId.valueId };
		}
		// todo: assign originalObject back to extracted, and use that extracted key
		// (a cyclical ID) as the value of the extracted cyclical reference
		const cyclicalReferenceOriginal = this.#cyclicalType.isMatch(null);
		if (!cyclicalReferenceOriginal) return false;
		const cyclicalIdObject = createReferencedValueId(
			cyclicalReferenceOriginal,
			referencedPath,
		);
		// Remove circular references that will get recreated on merge
		const extractedValue = this.#createCircularPlaceholders(
			originalObject,
			cyclical,
		);
		extracted.set(cyclicalIdObject, { value: extractedValue });

		const isMatch = this.#cyclicalType.isMatch(null);
		if (!isMatch) return false;
		const id = createReferencedValueId(isMatch, originalPath);
		if (saveReferences) {
			this.#extractedCyclicalReferences.set(originalObject, {
				valueId: cyclicalIdObject,
				refId: id,
			});
		}
		return { id, referencedId: cyclicalIdObject };
	}

	#replaceCyclicalReferences(
		provided: unknown,
		extracted: ReplacedReferencesOpaque,
		cyclical: CyclicalReferences,
		path: PropertyKey[],
	) {
		if (!this.#replaceCyclical) return null;
		const cyclicalPath = cyclical.has(provided) && cyclical.get(provided);
		if (cyclicalPath) {
			return this.#createCyclicalMappedItem(
				extracted,
				path,
				cyclicalPath,
				provided,
				cyclical,
			);
		}
		const maintainedCyclicalPath =
			this.#maintainReferences &&
			this.#cyclicalReferences.has(provided) &&
			this.#cyclicalReferences.get(provided);
		if (maintainedCyclicalPath) {
			return this.#createCyclicalMappedItem(
				extracted,
				path,
				maintainedCyclicalPath,
				provided,
				cyclical,
			);
		}
		// now set the current object for potential future reference
		cyclical.set(provided, path);
		if (this.#maintainReferences) {
			this.#cyclicalReferences.set(provided, path);
		}
		return null;
	}

	/**
	 * As a final step, after all extraction is complete, replace any root-level
	 * cyclical references with IDs referencing the path of the referenced value.
	 *
	 * This needs to happen after extracting values since the referenced value
	 * was already iterated on (and it wasn't known that was an original reference
	 * until the reference to it was found).
	 */
	#replaceRootCyclicalReferences(
		provided: unknown,
		extracted: ReplacedReferencesOpaque,
	) {
		// find the root-level cyclical references and replace them in the object
		const isObjectOrArray = isPlainObject(provided) || Array.isArray(provided);
		if (!isObjectOrArray) throw new TypeError("Expected object or array");
		// find the extracted key with a .value property, extract the ID's path
		// and then replace that path with a reference to the found ID
		for (const [id, item] of extracted) {
			const { prefixType, path } = extractReferenceValueIdParts(id);
			if (prefixType !== this.#cyclicalPrefix) continue;
			if (isPlainObject(item) && "value" in item) {
				setProperty(provided, path, id);
			}
		}
	}

	#extract(
		provided: unknown,
		extracted: ReplacedReferencesOpaque = new Map(),
		cyclical: CyclicalReferences = new Map(),
		path: PropertyKey[] = [],
	): [provided: unknown, extracted: ReplacedReferencesOpaque] {
		const cyclicalPath = this.#replaceCyclicalReferences(
			provided,
			extracted,
			cyclical,
			path,
		);
		if (cyclicalPath) {
			const { id, referencedId } = cyclicalPath;
			extracted.set(id, { ref: referencedId });
			return [id, extracted];
		}
		const depth = path.length;
		const nextDepth = depth + 1;
		const recursionAllowed = nextDepth < this.#recursiveDepth;
		const recursionIntoArraysAllowed =
			recursionAllowed && this.#recurseIntoArrays;
		const replaced = this.#replaceReference(provided, path);
		// first, try to replace the value directly
		// (always allowed regardless of recursion depth)
		if (replaced) {
			extracted.set(replaced, provided);
			return [replaced, extracted];
		} else if (Array.isArray(provided)) {
			if (!recursionIntoArraysAllowed) return [provided, extracted];
			let newEntryCount = 0;
			const updatedProvided = provided.map((item, index) => {
				const [entry, extractedPending] = this.#extract(
					item,
					extracted,
					cyclical,
					[...path, index],
				);
				newEntryCount += extractedPending.size;
				return entry;
			});
			const updatedReturn = newEntryCount > 0 ? updatedProvided : provided;
			if (depth === 0) {
				this.#replaceRootCyclicalReferences(updatedProvided, extracted);
			}
			return [updatedReturn, extracted];
		} else if (isPlainObject(provided)) {
			if (!recursionAllowed) return [provided, extracted];
			let newEntriesCount = 0;
			const entries = Object.entries(provided).map(([key, item]) => {
				const [entry, extractedPending] = this.#extract(
					item,
					extracted,
					cyclical,
					[...path, key],
				);
				newEntriesCount += extractedPending.size;
				return [key, entry];
			});
			const updatedProvided =
				newEntriesCount > 0 ? Object.fromEntries(entries) : provided;
			if (depth === 0) {
				this.#replaceRootCyclicalReferences(updatedProvided, extracted);
			}
			return [updatedProvided, extracted];
		}
		return [provided, extracted];
	}

	extract<T = unknown>(given: T): [provided: T, extracted: ReplacedReferences] {
		return this.#extract(given) as [T, ReplacedReferences];
	}

	/**
	 * Before adding back merged properties or adding back cyclical references,
	 * add back the objects to which references point first, so that references
	 * are created as expected in the final object.
	 */
	#addBackRootCyclicalReferences(
		given: unknown,
		extracted: ReplacedReferences,
	) {
		// find the root-level cyclical references and set those in the object
		const isObjectOrArray = isPlainObject(given) || Array.isArray(given);
		if (!isObjectOrArray) throw new TypeError("Expected object or array");
		for (const [id, item] of extracted) {
			const parts = extractReferenceValueIdParts(id as ReferencedValueId);
			const { prefixType, path } = parts;
			if (prefixType !== this.#cyclicalPrefix) continue;
			if (isPlainObject(item) && "value" in item) {
				setProperty(given, path, item.value);
			}
		}
	}

	merge<T = unknown>(given: T, extracted: ReplacedReferences): T {
		const isObjectOrArray = isPlainObject(given) || Array.isArray(given);
		// first, add back any root cyclical references
		if (isObjectOrArray) this.#addBackRootCyclicalReferences(given, extracted);
		// Pre-compute the root object value to avoid searching in every iteration
		let rootObjectValue = null;
		for (const [rootId, rootItem] of extracted) {
			const rootParts = extractReferenceValueIdParts(
				rootId as ReferencedValueId,
			);
			const isCyclicalType = rootParts.prefixType === this.#cyclicalPrefix;
			const referencesRoot = isCyclicalType && rootParts.path.length === 0;
			const rootItemHasValue =
				referencesRoot && isPlainObject(rootItem) && "value" in rootItem;
			if (!rootItemHasValue) continue;
			rootObjectValue = rootItem.value;
			break;
		}
		// now add back extracted types, including references to root cyclical references
		for (const [id, item] of extracted) {
			const parts = extractReferenceValueIdParts(id as ReferencedValueId);
			const { prefixType, path } = parts;
			if (prefixType === this.#cyclicalPrefix) {
				const itemIsObject = isPlainObject(item);
				const extractedRefFound = itemIsObject && "ref" in item;
				if (!extractedRefFound) continue;
				const ref = extracted.get(item.ref);
				const refContainsValue =
					isObjectOrArray && isPlainObject(ref) && "value" in ref;
				if (!refContainsValue) continue;
				// If ref.value is the same as the root object, use given instead
				const valueToSet = ref.value === rootObjectValue ? given : ref.value;
				setProperty(given, path, valueToSet);
				continue;
			}
			// when no path is provided, it is the root
			if (path.length === 0) return item as T;
			// when the path is provided, set the property on the given object
			if (isObjectOrArray)
				setProperty(given as Record<PropertyKey, unknown>, path, item);
		}
		return given;
	}

	#supportedTypes: IdGenerator[] = [];

	addSupportedType(
		idPrefix: string,
		isMatch: (given: unknown) => boolean,
	): void {
		if (idPrefix === this.#cyclicalPrefix)
			throw new Error(`'${this.#cyclicalPrefix}' is a reserved prefix`);
		const newSupportedType = new IdGenerator(idPrefix, isMatch);
		this.#supportedTypes.push(newSupportedType);
	}

	destroy(): void {
		this.#supportedTypes = [];
		this.#extractedReferences.clear();
		this.#cyclicalReferences.clear();
		this.#extractedCyclicalReferences.clear();
	}

	[Symbol.dispose](): void {
		this.destroy();
	}
}

function boolToDepth(given: boolean | number) {
	return typeof given === "number" ? given : given ? Infinity : 0;
}

const ReferencedValueSymbol: unique symbol = Symbol();
export type ReferencedValueId = Opaque<string, typeof ReferencedValueSymbol>;
export function createReferencedValueId(
	prefix: EventId,
	path: PropertyKey[] = [],
): ReferencedValueId {
	return castToOpaque<ReferencedValueId>(
		[prefix, path.join(".")].filter((p) => p !== "").join("-"),
	);
}
type ReferencedValueParts = {
	prefix: EventId;
	path: PropertyKey[];
	prefixType: string;
	prefixCount: number;
};
export function extractReferenceValueIdParts(
	id: ReferencedValueId,
): ReferencedValueParts {
	const [prefixGiven, pathPart] = id.split("-");
	const prefix = castToEventId(prefixGiven);
	const [_, prefixType, prefixCountString] =
		prefix.match(/^([a-zA-Z]+)([0-9]+)$/) ?? [];
	if (!prefixType || !prefixCountString) {
		throw new TypeError(`Invalid ReferencedValueId: ${id}`);
	}
	const prefixCount = Number(prefixCountString);
	const path = pathPart ? pathPart.split(".") : [];
	return { prefix, path, prefixType, prefixCount };
}

export type ReplacedReferences = Map<string, unknown>;
type ReplacedReferencesOpaque = Map<ReferencedValueId, unknown>;
type ExtractedReferencesOpaque = Map<unknown, ReferencedValueId>;

type RecursionDepthProvided = number | boolean;
type RecursionOptions =
	| RecursionDepthProvided
	| { depth: RecursionDepthProvided; arrays?: boolean };

type CyclicalReferences = Map<unknown, PropertyKey[]>;
type ExtractedCyclicalReferencesOpaque = Map<
	unknown,
	{ valueId: ReferencedValueId; refId: ReferencedValueId }
>;

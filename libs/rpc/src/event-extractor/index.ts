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
	) {
		this.#recursiveDepth =
			typeof recursive === "object"
				? boolToDepth(recursive.depth)
				: boolToDepth(recursive);
		this.#recurseIntoArrays =
			typeof recursive === "object" ? (recursive.arrays ?? true) : true;
		this.#maintainReferences = maintainReferences;
	}

	#extractedReferences: ExtractedReferencesOpaque = new Map();

	#replaceReference(
		original: unknown,
		path: PropertyKey[],
	): false | ReferencedValueId {
		const saveReferences = this.#maintainReferences;
		if (saveReferences && this.#extractedReferences.has(original)) {
			const savedId = this.#extractedReferences.get(original);
			const { prefix } = extractReferenceValueIdParts(savedId);
			const newId = createReferencedValueId(prefix, path);
			if (saveReferences && !this.#extractedReferences.has(original)) {
				this.#extractedReferences.set(original, newId);
			}
			return newId;
		}
		for (const supportedType of this.#supportedTypes) {
			const isMatch = supportedType.isMatch(original);
			if (!isMatch) break;
			const newId = createReferencedValueId(isMatch, path);
			if (saveReferences && !this.#extractedReferences.has(original)) {
				this.#extractedReferences.set(original, newId);
			}
			return newId;
		}
		return false;
	}

	#extract(
		provided: unknown,
		extracted: ReplacedReferencesOpaque = new Map(),
		path: PropertyKey[] = [],
	): [provided: unknown, extracted: ReplacedReferencesOpaque] {
		const depth = path.length;
		const nextDepth = depth + 1;
		const recursionAllowed = nextDepth < this.#recursiveDepth;
		const recursionIntoArraysAllowed =
			recursionAllowed && this.#recurseIntoArrays;
		const replacedNew = this.#replaceReference(provided, path);
		const replaced = replacedNew;
		// first, try to replace the value directly
		// (always allowed regardless of recursion depth)
		if (replaced) {
			extracted.set(replaced, provided);
			return [replaced, extracted];
		} else if (Array.isArray(provided)) {
			if (!recursionIntoArraysAllowed) return [provided, extracted];
			const updatedProvided = provided.map((item, index) =>
				this.#extract(item, extracted, [...path, index]).at(0),
			);
			return [updatedProvided, extracted];
		} else if (isPlainObject(provided)) {
			if (!recursionAllowed) return [provided, extracted];
			const entries = Object.entries(provided).map(([key, item]) => [
				key,
				this.#extract(item, extracted, [...path, key]).at(0),
			]);
			return [Object.fromEntries(entries), extracted];
		}
		return [provided, extracted];
	}

	extract<T = unknown>(given: T): [provided: T, extracted: ReplacedReferences] {
		return this.#extract(given) as [T, ReplacedReferences];
	}

	merge<T = unknown>(given: T, extracted: ReplacedReferences): T {
		for (const [id, item] of extracted) {
			const [_type, path] = id.split("-");
			if (!path) return item as T; // when no path is provided, it is the root
			const isObjectOrArray = isPlainObject(given) || Array.isArray(given);
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
		const newSupportedType = new IdGenerator(idPrefix, isMatch);
		this.#supportedTypes.push(newSupportedType);
	}

	destroy(): void {
		this.#supportedTypes = [];
		this.#extractedReferences.clear();
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
};
export function extractReferenceValueIdParts(
	id: ReferencedValueId,
): ReferencedValueParts {
	const [prefixGiven, pathPart] = id.split("-");
	const prefix = castToEventId(prefixGiven);
	const path = pathPart ? pathPart.split(".") : [];
	return { prefix, path };
}

export type ReplacedReferences = Map<string, unknown>;
type ReplacedReferencesOpaque = Map<ReferencedValueId, unknown>;
type ExtractedReferencesOpaque = Map<unknown, ReferencedValueId>;

type RecursionDepthProvided = number | boolean;
type RecursionOptions =
	| RecursionDepthProvided
	| { depth: RecursionDepthProvided; arrays?: boolean };

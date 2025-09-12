import { isNullish } from "emery";

// FIXME: it may be useful to determine if object itself has iterator methods
// (iterator) or whether it just contains an iterator symbol that contains an
// iterator (an iterable). It may also be useful to differentiate between sync
// and async iterators.
export function isIterable(
	provided: unknown,
): provided is IterableIterator<unknown> | AsyncIterableIterator<unknown> {
	if (isNullish(provided)) return false;
	if (typeof provided !== "object") return false;
	if (Symbol.asyncIterator in provided) {
		return typeof provided[Symbol.asyncIterator] === "function";
	}
	if (Symbol.iterator in provided) {
		return typeof provided[Symbol.iterator] === "function";
	}
	return false;
}

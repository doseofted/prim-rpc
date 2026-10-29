import { isNullish } from "emery";

export enum IteratorType {
	Sync = 1,
	Async,
	Either,
}

export function isIterable<Type extends IteratorType = IteratorType.Either>(
	provided: unknown,
	type: Type = IteratorType.Either as Type,
): provided is Type extends IteratorType.Either
	? AsyncIterable<unknown> | Iterable<unknown>
	: Type extends IteratorType.Async
		? AsyncIterable<unknown>
		: Iterable<unknown> {
	if (isNullish(provided)) return false;
	if (typeof provided === "string") return true; // strings are iterable but not objects
	if (typeof provided !== "object") return false;
	const checkBoth = type === IteratorType.Either;
	const checkAsync = checkBoth || type === IteratorType.Async;
	if (checkAsync && Symbol.asyncIterator in provided) {
		return typeof provided[Symbol.asyncIterator] === "function";
	}
	const checkSync = checkBoth || type === IteratorType.Sync;
	if (checkSync && Symbol.iterator in provided) {
		return typeof provided[Symbol.iterator] === "function";
	}
	return false;
}

export function isIterator<Type extends IteratorType = IteratorType.Either>(
	provided: unknown,
	type: Type = IteratorType.Either as Type,
): provided is Type extends IteratorType.Either
	? AsyncIterableIterator<unknown> | IterableIterator<unknown>
	: Type extends IteratorType.Async
		? AsyncIterableIterator<unknown>
		: IterableIterator<unknown> {
	if (!isIterable(provided, type)) return false;
	if (typeof provided === "string") return false; // strings are iterable but not iterators
	if ("next" in provided) {
		return typeof provided.next === "function";
	}
	return false;
}

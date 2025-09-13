import { expect, test } from "vitest";
import { isIterable, isIterator } from "./is-iterable";

test("isIterable can identify iterables", () => {
	expect(isIterable({})).toBe(false);

	expect(isIterable([])).toBe(true);
	expect(isIterable(new Map())).toBe(true);
	expect(isIterable(new Set())).toBe(true);
	expect(isIterable("string")).toBe(true);

	expect(isIterable([][Symbol.iterator]())).toBe(true);
	expect(isIterable(new Map()[Symbol.iterator]())).toBe(true);
	expect(isIterable(new Set()[Symbol.iterator]())).toBe(true);
	expect(isIterable("string"[Symbol.iterator]())).toBe(true);

	async function* generator() {
		yield 1;
	}
	expect(isIterable(generator)).toBe(false);
	expect(isIterable(generator())).toBe(true);
});

test("isIterator can identify iterators", () => {
	expect(isIterator({})).toBe(false);

	expect(isIterator([])).toBe(false);
	expect(isIterator(new Map())).toBe(false);
	expect(isIterator(new Set())).toBe(false);
	expect(isIterator("string")).toBe(false);

	expect(isIterator([][Symbol.iterator]())).toBe(true);
	expect(isIterator(new Map()[Symbol.iterator]())).toBe(true);
	expect(isIterator(new Set()[Symbol.iterator]())).toBe(true);
	expect(isIterator("string"[Symbol.iterator]())).toBe(true);

	async function* generator() {
		yield 1;
	}
	expect(isIterator(generator)).toBe(false);
	expect(isIterator(generator())).toBe(true);
});

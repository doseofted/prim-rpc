import { isPromise } from "es-toolkit";
import { describe, expect, test } from "vitest";
import { isIterator } from "../utils/is-iterable";
import { EventExtractor } from ".";

describe("EventExtractor can extract top-level properties", () => {
	test("can extract a promise from a simple object", () => {
		using extractor = new EventExtractor(true, false);
		extractor.addSupportedType("p", isPromise);
		const original = {
			promise: Promise.resolve(123),
		};
		const [replaced, extracted] = extractor.extract(original);
		expect(replaced).toEqual({
			promise: expect.stringMatching(/^p\d+-promise$/),
		});
		expect(extracted.size).toBe(1);
		const promisedKey = Array.from(extracted.keys()).join("");
		expect(promisedKey).toContain("p");
		expect(extracted.get(promisedKey)).toBe(original.promise);
	});

	test("can extract an iterator from a simple object", () => {
		using extractor = new EventExtractor(true, false);
		extractor.addSupportedType("i", isIterator);
		const original = {
			iterator: (function* () {
				yield 1;
				yield 2;
				yield 3;
			})(),
		};
		const [replaced, extracted] = extractor.extract(original);
		expect(replaced).toEqual({
			iterator: expect.stringMatching(/^i\d+-iterator$/),
		});
		expect(extracted.size).toBe(1);
		const iteratorKey = Array.from(extracted.keys()).join("");
		expect(iteratorKey).toContain("i");
		expect(extracted.get(iteratorKey)).toBe(original.iterator);
	});

	test("can extract an async iterator from a simple object", () => {
		using extractor = new EventExtractor(true, false);
		extractor.addSupportedType("i", isIterator);
		const original = {
			asyncIterator: (async function* () {
				yield 1;
				yield 2;
				yield 3;
			})(),
		};
		const [replaced, extracted] = extractor.extract(original);
		expect(replaced).toEqual({
			asyncIterator: expect.stringMatching(/^i\d+-asyncIterator$/),
		});
		expect(extracted.size).toBe(1);
		const iteratorKey = Array.from(extracted.keys()).join("");
		expect(iteratorKey).toContain("i");
		expect(extracted.get(iteratorKey)).toBe(original.asyncIterator);
	});
});

describe("EventExtractor can extract nested properties", () => {
	test("can extract a promise from a nested object", () => {
		using extractor = new EventExtractor(true, false);
		extractor.addSupportedType("p", isPromise);
		const original = {
			deeply: {
				nested: {
					promise: Promise.resolve(123),
				},
			},
		};
		const [replaced, extracted] = extractor.extract(original);
		expect(replaced).toEqual({
			deeply: {
				nested: {
					promise: expect.stringMatching(/^p\d+-deeply\.nested\.promise$/),
				},
			},
		});
		expect(extracted.size).toBe(1);
		const promisedKey = Array.from(extracted.keys()).join("");
		expect(promisedKey).toContain("p");
		expect(extracted.get(promisedKey)).toBe(original.deeply.nested.promise);
	});
});

describe("EventExtractor can maintain references across multiple usages", () => {
	test("can maintain references to previously extracted promises", () => {
		using extractor = new EventExtractor(true, true);
		extractor.addSupportedType("p", isPromise);
		const original = {
			promise: Promise.resolve(123),
		};
		const [replaced1, extracted1] = extractor.extract(original);
		expect(replaced1).toEqual({
			promise: expect.stringMatching(/^p\d+-promise$/),
		});
		expect(extracted1.size).toBe(1);
		const promisedKey1 = Array.from(extracted1.keys()).join("");
		expect(promisedKey1).toContain("p");
		expect(extracted1.get(promisedKey1)).toBe(original.promise);

		const [promisedKey1Prefix] = promisedKey1.split("-");
		const original2 = { theSamePromise: original.promise };
		const [replaced2, extracted2] = extractor.extract(original2);
		expect(replaced2).toEqual({
			theSamePromise: expect.stringMatching(
				new RegExp(`^${promisedKey1Prefix}-theSamePromise$`),
			),
		});
		expect(extracted2.size).toBe(1);
		const promisedKey2 = Array.from(extracted2.keys()).join("");
		expect(promisedKey2).toContain("p");

		expect(promisedKey1).not.toBe(promisedKey2);
		expect(extracted1.get(promisedKey1)).toBe(original.promise);
		expect(extracted2.get(promisedKey2)).toBe(original.promise);
	});
});

describe("EventExtractor can merge extracted values back into original", () => {
	test("can merge a promise back into a simple object", () => {
		using extractor = new EventExtractor(true, false);
		extractor.addSupportedType("p", isPromise);
		const original = {
			promise: Promise.resolve(123),
		};
		const [replaced, extracted] = extractor.extract(original);
		expect(replaced).toEqual({
			promise: expect.stringMatching(/^p\d+-promise$/),
		});
		expect(extracted.size).toBe(1);
		const promisedKey = Array.from(extracted.keys()).join("");
		expect(promisedKey).toContain("p");
		expect(extracted.get(promisedKey)).toBe(original.promise);

		const merged = extractor.merge(replaced, extracted);
		expect(merged).toEqual(original);
	});

	test("can merge a promise provided at the top-level", () => {
		using extractor = new EventExtractor(true, false);
		extractor.addSupportedType("p", isPromise);
		const original = Promise.resolve(123);
		const [replaced, extracted] = extractor.extract(original);
		expect(replaced).toEqual(expect.stringMatching(/^p\d+$/));
		expect(extracted.size).toBe(1);
		const promisedKey = Array.from(extracted.keys()).join("");
		expect(promisedKey).toContain("p");
		expect(extracted.get(promisedKey)).toBe(original);

		const merged = extractor.merge(replaced, extracted);
		expect(merged).toBe(original);
	});
});

describe.todo("EventExtractor can handle circular references", () => {
	// ...
});

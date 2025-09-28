import { isPromise } from "es-toolkit";
import { describe, expect, test } from "vitest";
import { isIterator } from "../utils/is-iterable";
import { EventExtractor, extractReferenceValueIdParts } from ".";

const recursionDepthDefault = 7;

describe("EventExtractor can extract top-level properties", () => {
	test("can extract a promise from a simple object", () => {
		using extractor = new EventExtractor(recursionDepthDefault, false);
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
		using extractor = new EventExtractor(recursionDepthDefault, false);
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
		using extractor = new EventExtractor(recursionDepthDefault, false);
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
		using extractor = new EventExtractor(recursionDepthDefault, false);
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
		using extractor = new EventExtractor(recursionDepthDefault, true);
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
		using extractor = new EventExtractor(recursionDepthDefault, false);
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
		using extractor = new EventExtractor(recursionDepthDefault, false);
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

describe("EventExtractor can handle cyclical references", () => {
	test("can extract and replace cyclical references", () => {
		using extractor = new EventExtractor(recursionDepthDefault, false, true);
		const original = {
			lorem: {
				ipsum: "dolor",
			},
			reference: { ipsum: "to be replaced" },
			another: [{ ipsum: "to be replaced" }],
			and: {
				one: {
					more: { ipsum: "to be replaced" },
					and: { ipsum: "stay the same" },
				},
			},
		};
		original.reference = original.lorem;
		original.another[0] = original.reference;
		original.and.one.more = original.another[0];
		expect(original.lorem).toBe(original.reference);
		expect(original.lorem).toBe(original.another[0]);
		expect(original.lorem).toBe(original.and.one.more);
		const [replaced, extracted] = extractor.extract(original);
		expect(replaced).toEqual({
			lorem: expect.stringMatching(/^c\d+-lorem$/),
			reference: expect.stringMatching(/^c\d+-.*$/),
			another: [expect.stringMatching(/^c\d+-.*$/)],
			and: {
				one: {
					more: expect.stringMatching(/^c\d+-.*$/),
					and: { ipsum: "stay the same" },
				},
			},
		});
		expect(extracted.size).toBe(4);
		expect(replaced.lorem).toEqual(expect.stringMatching(/^c\d+-lorem$/));
		// biome-ignore lint/suspicious/noExplicitAny: the value was replaced (but types aren't transformed)
		const { prefix } = extractReferenceValueIdParts(replaced.reference as any);
		const expectIdString = expect.stringMatching(new RegExp(`^${prefix}-.*$`));
		expect(replaced.reference).toEqual(expectIdString);
		expect(replaced.another[0]).toEqual(expectIdString);
		expect(replaced.and.one.more).toEqual(expectIdString);
	});

	test("can merge cyclical references back into original and retain references", () => {
		using extractor = new EventExtractor(recursionDepthDefault, false, true);
		const original = {
			lorem: {
				ipsum: "dolor",
			},
			reference: { ipsum: "to be replaced" },
			another: [{ ipsum: "to be replaced" }],
			and: {
				one: {
					more: { ipsum: "to be replaced" },
					and: { ipsum: "stay the same" },
				},
			},
		};
		original.reference = original.lorem;
		original.another[0] = original.reference;
		original.and.one.more = original.another[0];
		const [replaced, extracted] = extractor.extract(original);
		const merged = extractor.merge(replaced, extracted);
		expect(merged).toEqual(original);
		expect(merged.lorem).toBe(merged.reference);
		expect(merged.lorem).toBe(merged.another[0]);
		expect(merged.lorem).toBe(merged.and.one.more);
		expect(merged.and.one.and).toEqual({ ipsum: "stay the same" });
	});

	test("can handle self reference", () => {
		using extractor = new EventExtractor(recursionDepthDefault, false, true);
		type SelfReferencing = { self?: SelfReferencing };
		const original: SelfReferencing = {
			self: undefined,
		};
		original.self = original;
		const [replaced, extracted] = extractor.extract(original);

		expect(replaced).toEqual({
			self: expect.stringMatching(/^c\d+-self$/),
		});
		expect(extracted.size).toBe(2);
		const extractedKeys = Array.from(extracted.keys());
		expect(extractedKeys.every((key) => key.startsWith("c"))).toBe(true);
		// Check that one of the extracted items is the original object
		expect(() =>
			Array.from(extracted.values()).every((value) => JSON.stringify(value)),
		).not.toThrow();
		const merged = extractor.merge(replaced, extracted);
		expect(merged.self).toBe(merged);
	});

	test("can handle circular references to parent objects", () => {
		using extractor = new EventExtractor(recursionDepthDefault, false, true);
		type Book = { title: string; editors: Editor[] };
		type Editor = { name: string; books: Book[] };
		type Library = { books: Book[]; editors: Editor[] };
		const original: Library = {
			books: [
				{
					title: "Book",
					editors: [
						{
							name: "Author (replaced)",
							books: [],
						},
					],
				},
			],
			editors: [
				{
					name: "Author",
					books: [
						{
							title: "Book (replaced)",
							editors: [],
						},
					],
				},
			],
		};
		original.books[0].editors[0] = original.editors[0];
		original.editors[0].books[0] = original.books[0];
		const [replaced, extracted] = extractor.extract(original);

		expect(extracted.size).toBe(4);
		expect(() => JSON.stringify(replaced)).not.toThrow();
		const extractedKeys = Array.from(extracted.keys());
		expect(extractedKeys.every((key) => key.startsWith("c"))).toBe(true);
		expect(() =>
			Array.from(extracted.values()).every((value) => JSON.stringify(value)),
		).not.toThrow();

		const merged = extractor.merge(replaced, extracted);
		expect(merged.books[0].editors[0]).toBe(merged.editors[0]);
		expect(merged.editors[0].books[0]).toBe(merged.books[0]);
		expect(merged.books[0].editors[0].books[0]).toBe(merged.books[0]);
		expect(merged.editors[0].books[0].editors[0]).toBe(merged.editors[0]);
		expect(merged.books[0].title).toBe("Book");
		expect(merged.editors[0].name).toBe("Author");
		expect(() => JSON.stringify(merged)).toThrow();
	});
});

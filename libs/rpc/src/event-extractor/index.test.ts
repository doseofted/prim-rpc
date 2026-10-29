import { isPromise } from "es-toolkit";
import { afterEach, describe, expect, test } from "vitest";
import { isIterator } from "../utils/is-iterable";
import {
	createReferencedValueId,
	EventExtractor,
	EventExtractorError,
	extractReferenceValueIdParts,
	type ReferencedValueId,
} from ".";
import { castToEventId } from "./id-generator";

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

	test("can handle references across multiple provided objects", () => {
		using extractor = new EventExtractor(recursionDepthDefault, true, true);
		type Node = { value: string; next?: Node };
		const sharedChild: Node = { value: "child" };
		const original1: Node = { value: "parent1", next: sharedChild };
		const original2: Node = { value: "parent2", next: sharedChild };
		const [replaced1, extracted1] = extractor.extract(original1);
		const [replaced2, extracted2] = extractor.extract(original2);
		expect(replaced1).toEqual({
			value: "parent1",
			next: { value: "child" },
		});
		expect(replaced2).toEqual({
			value: "parent2",
			next: expect.stringMatching(/^c\d+-next$/),
		});
		expect(extracted1.size).toBe(0);
		expect(extracted2.size).toBe(2);
		const extractedKeys2 = Array.from(extracted2.keys());
		expect(extractedKeys2.every((key) => key.startsWith("c"))).toBe(true);

		const merged1 = extractor.merge(replaced1, extracted1);
		const merged2 = extractor.merge(replaced2, extracted2);
		expect(merged1.next).toBe(sharedChild);
		expect(merged2.next).toBe(sharedChild);
		expect(merged1.next).toBe(merged2.next);
		expect(merged1.next?.value).toBe("child");
		expect(merged2.next?.value).toBe("child");
	});
});

describe("EventExtractor rejects extracted paths in the deny list", () => {
	afterEach(() => {
		// biome-ignore lint/suspicious/noExplicitAny: resetting prototype prop
		delete (Object.prototype as any).polluted;
		// biome-ignore lint/suspicious/noExplicitAny: resetting prototype prop
		delete (Object.prototype as any).isAdmin;
	});

	test("merge throws on a path that walks through `constructor.prototype`", () => {
		using extractor = new EventExtractor(recursionDepthDefault, false, false);
		// ensure the prefix is supported so that we can test the path safety guard
		extractor.addSupportedType("p", isPromise);
		const maliciousKey = "p1-constructor.prototype.polluted";
		const extracted = new Map<string, unknown>([[maliciousKey, "PWNED"]]);
		const given: Record<string, unknown> = {};

		expect(() => extractor.merge(given, extracted)).toThrow(TypeError);
		// biome-ignore lint/suspicious/noExplicitAny: probing prototype
		expect(({} as any).polluted).toBeUndefined();
	});

	test("merge throws on a cyclical-ref path through `constructor.prototype`", () => {
		// The cyclical prefix `c` does not need to be registered (only toggled on)
		using extractor = new EventExtractor(recursionDepthDefault, false, true);
		const refKey = "c1-some.legit.path";
		const polluteKey = "c2-constructor.prototype.isAdmin";
		const extracted = new Map<string, unknown>([
			[refKey, { value: true }],
			[polluteKey, { ref: refKey }],
		]);
		const given: Record<string, unknown> = {};

		expect(() => extractor.merge(given, extracted)).toThrow(TypeError);
		// biome-ignore lint/suspicious/noExplicitAny: probing prototype
		expect(({} as any).isAdmin).toBeUndefined();
	});

	test("merge throws when any reserved key (e.g. `__proto__`, `prototype`) appears in the path", () => {
		using extractor = new EventExtractor(recursionDepthDefault, false, false);
		extractor.addSupportedType("p", isPromise);
		const cases = [
			"p1-__proto__.polluted",
			"p1-prototype.polluted",
			"p1-foo.constructor.bar",
			"p1-toString",
		];
		for (const id of cases) {
			const given: Record<string, unknown> = {};
			expect(() => extractor.merge(given, new Map([[id, "x"]]))).toThrow(
				TypeError,
			);
		}
		// biome-ignore lint/suspicious/noExplicitAny: probing prototype
		expect(({} as any).polluted).toBeUndefined();
	});

	test("extractReferenceValueIdParts utility throws on a value from deny list", () => {
		expect(() =>
			extractReferenceValueIdParts(
				"p1-constructor.prototype.polluted" as ReferencedValueId,
			),
		).toThrow(TypeError);
	});

	test("createReferencedValueId refuses to create an ID with a value from deny list", () => {
		const prefix = castToEventId("p1");
		expect(() =>
			createReferencedValueId(prefix, ["constructor", "prototype", "x"]),
		).toThrow(TypeError);
		expect(() => createReferencedValueId(prefix, ["__proto__"])).toThrow(
			TypeError,
		);
		expect(() =>
			createReferencedValueId(prefix, ["safe", "path"]),
		).not.toThrow();
	});

	test("extract throws if a source object contains a reserved key in its path", () => {
		// while this isn't really malicious, there's also no legitimate use case for it
		using extractor = new EventExtractor(recursionDepthDefault, false, false);
		extractor.addSupportedType("p", isPromise);
		const original = {
			constructor: { prototype: { promise: Promise.resolve(123) } },
		};
		expect(() => extractor.extract(original)).toThrow(TypeError);
	});
});

describe("EventExtractor only accepts registered prefixes on merge", () => {
	test("merge rejects an unknown prefix that was never registered", () => {
		using extractor = new EventExtractor(recursionDepthDefault, false, false);
		// No `addSupportedType` call was made here "x" is not registered
		const extracted = new Map<string, unknown>([["x1-safe.path", "data"]]);
		const given: Record<string, unknown> = { safe: { path: "x1-safe.path" } };
		expect(() => extractor.merge(given, extracted)).toThrow(
			EventExtractorError,
		);
		// And nothing should have been written either.
		expect(given.safe).toEqual({ path: "x1-safe.path" });
	});

	test("merge accepts a prefix once it is registered", () => {
		using extractor = new EventExtractor(recursionDepthDefault, false, false);
		extractor.addSupportedType("p", isPromise);
		const extracted = new Map<string, unknown>([["p1-nested.value", 42]]);
		const given: Record<string, unknown> = { nested: {} };
		expect(() => extractor.merge(given, extracted)).not.toThrow();
		expect(given.nested).toEqual({ value: 42 });
	});

	test("merge accepts a prefix registered after the payload was constructed (late registration)", () => {
		using extractor = new EventExtractor(recursionDepthDefault, false, false);
		const extracted = new Map<string, unknown>([["p1-nested.value", 42]]);
		// Before registration, there's no handler for this type.
		expect(() => extractor.merge({ nested: {} }, extracted)).toThrow(
			EventExtractorError,
		);
		// After registration, we know that this type is supported.
		extractor.addSupportedType("p", isPromise);
		const given: Record<string, unknown> = { nested: {} };
		expect(() => extractor.merge(given, extracted)).not.toThrow();
		expect(given.nested).toEqual({ value: 42 });
	});

	test("merge still accepts the built-in cyclical prefix without any registration", () => {
		using extractor = new EventExtractor(recursionDepthDefault, false, true);
		type SelfRef = { self?: SelfRef };
		const original: SelfRef = {};
		original.self = original;
		const [replaced, extracted] = extractor.extract(original);
		const merged = extractor.merge(replaced, extracted);
		expect(merged.self).toBe(merged);
	});

	test("merge rejects a mixed payload if any single entry uses an unknown prefix", () => {
		// Fail-fast: a single bad entry invalidates the whole `extracted` map.
		using extractor = new EventExtractor(recursionDepthDefault, false, false);
		extractor.addSupportedType("p", isPromise);
		const extracted = new Map<string, unknown>([
			["p1-good.value", "ok"],
			["zz9-unknown.path", "bad"],
		]);
		const given: Record<string, unknown> = { good: {}, unknown: {} };
		expect(() => extractor.merge(given, extracted)).toThrow(
			EventExtractorError,
		);
	});

	test("merge rejects cyclical-prefixed entries when replaceCyclical is disabled", () => {
		using extractor = new EventExtractor(recursionDepthDefault, false, false);
		const extracted = new Map<string, unknown>([
			["c1-some.path", { value: "rejected" }],
		]);
		const given: Record<string, unknown> = { some: {} };
		expect(() => extractor.merge(given, extracted)).toThrow(
			EventExtractorError,
		);
		// Nothing should have been written.
		expect(given.some).toEqual({});
	});

	test("merge rejects a cyclical-ref payload when replaceCyclical is disabled", () => {
		// Same opt-out, but using the `{ ref: ... }` shape that the cyclical
		// branch normally consumes. Without the gate this would have run the
		// `setProperty(given, path, valueToSet)` line inside merge.
		using extractor = new EventExtractor(recursionDepthDefault, false, false);
		const extracted = new Map<string, unknown>([
			["c1-target.path", { value: { hello: "world" } }],
			["c2-other.path", { ref: "c1-target.path" }],
		]);
		const given: Record<string, unknown> = { target: {}, other: {} };
		expect(() => extractor.merge(given, extracted)).toThrow(
			EventExtractorError,
		);
		expect(given.target).toEqual({});
		expect(given.other).toEqual({});
	});
});

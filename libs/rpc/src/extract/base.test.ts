import { expect, test } from "vitest"
import { extract, iterate, merge } from "./base"

const exampleRandomIdGenerator = (index: number) => () => ["test", ++index].join("_")

test("object can be iterated on", () => {
	const generateId = exampleRandomIdGenerator(0)
	const original = {
		a: {
			b: true,
		},
		list: [1, 2, 3, true],
		cool: [{ a: 1 }, { b: true }],
	}
	const expected = {
		a: {
			b: "test_1",
		},
		list: [1, 2, 3, "test_2"],
		cool: [{ a: 1 }, { b: "test_3" }],
	}

	const extracted: Record<string, boolean> = {}
	const expectedExtracted: Record<string, boolean> = {
		test_1: true,
		test_2: true,
		test_3: true,
	}
	const paths = []
	const expectedPaths = ["a.b", "list.0", "list.1", "list.2", "list.3", "cool.0.a", "cool.1.b"]
	const result = iterate(original, (given, key) => {
		paths.push(key.join("."))
		if (typeof given === "boolean") {
			const id = typeof given === "boolean" ? generateId() : null
			extracted[id] = given
			return id
		}
		return given
	})
	expect(result).toEqual(expected)
	expect(paths).toEqual(expectedPaths)
	expect(extracted).toEqual(expectedExtracted)

	const merged = iterate(expected, given => {
		if (typeof given === "string" && given.startsWith("test")) {
			return extracted[given] ?? given
		}
	})
	expect(merged).toEqual(original)
})

test("Basic extract and merge works", () => {
	const original = { a: [1, "test"], b: { c: ["test"] } }
	const [extracted, modified] = extract<"test">(original, given => (given === "test" ? "t" : null))
	const expectedModified = { a: [1, "_t_a.1"], b: { c: ["_t_b.c.0"] } }
	const expectedExtracted = { "_t_a.1": "test", "_t_b.c.0": "test" }

	expect(modified).toEqual(expectedModified)
	expect(extracted).toEqual(expectedExtracted)

	const merged = merge<"test">(extracted, modified)
	expect(merged).toEqual(original)
})

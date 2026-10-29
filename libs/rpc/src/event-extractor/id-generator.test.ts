import { isString } from "es-toolkit";
import { expect, test } from "vitest";
import { IdGenerator } from "./id-generator";

test("IdGenerator can generate IDs based on provided matcher and prefix", () => {
	const idGenerator = new IdGenerator("s", (value) => isString(value));
	const id1 = idGenerator.isMatch("lorem");
	const id2 = idGenerator.isMatch("ipsum");
	const id3 = idGenerator.isMatch(123);

	expect(id1).toBe("s1");
	expect(id2).toBe("s2");
	expect(id3).toBe(false);
});

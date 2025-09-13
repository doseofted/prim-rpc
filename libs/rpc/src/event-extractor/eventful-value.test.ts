import { isString } from "es-toolkit";
import { expect, test } from "vitest";
import { EventfulValue } from "./eventful-value";

test("EventfulValue can generate IDs based on provided matcher and prefix", () => {
	const eventfulValue = new EventfulValue("s", (value) => isString(value));
	const id1 = eventfulValue.isMatch("lorem");
	const id2 = eventfulValue.isMatch("ipsum");
	const id3 = eventfulValue.isMatch(123);

	expect(id1).toBe("s1");
	expect(id2).toBe("s2");
	expect(id3).toBe(false);
});

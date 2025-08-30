import { expect, test } from "vitest";
import { hello } from ".";

test("hello says hi", () => {
	expect(hello()).toBe("hi");
});

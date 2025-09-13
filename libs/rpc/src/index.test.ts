import { expect, test } from "vitest";
import { hello } from ".";

test("hello says Prim+RPC", () => {
	expect(hello()).toBe("Prim+RPC");
});

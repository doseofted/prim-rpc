import { expect, test } from "vitest";
import { createRpc } from ".";

test("hello says Prim+RPC", () => {
	expect(createRpc()).toBe("Prim+RPC");
});

import { expect, test } from "vitest";
import { createRpc } from ".";

test("Prim+RPC client exists", () => {
	expect(createRpc()).toBeDefined();
});

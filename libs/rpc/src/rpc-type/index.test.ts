import { expect, test } from "vitest";
import { createRpcEventId } from "../types/rpc-structure";
import { RpcTypePromise } from "./promise";

test("RpcTypePromise can reconstruct and deconstruct", async () => {
	const fromRpc = new RpcTypePromise();
	const expectedValue = 42;
	const promised = new Promise((resolve) => fromRpc.onProvided(resolve));
	const toRpc = new RpcTypePromise();
	toRpc.onRpc((rpc) => fromRpc.provideRpc(rpc));
	toRpc.provideObject(Promise.resolve(expectedValue), createRpcEventId("p1"));
	await expect(promised).resolves.toBe(expectedValue);
});

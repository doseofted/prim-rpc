import { expect, test } from "vitest";
import { createRpcEventId } from "../types/rpc-structure";
import { RpcTypeIterator } from "./iterator";

test("RpcTypeIterator reconstructs lazily when next is called", async () => {
	const expectedValues = [1, 2, 3];
	const actualValue = (function* () {
		for (const value of expectedValues) {
			yield value;
		}
	})();

	const client = new RpcTypeIterator();
	const server = new RpcTypeIterator();

	const iterated = new Promise<AsyncIterableIterator<unknown>>((resolve) =>
		client.onProvided((value) =>
			resolve(value as AsyncIterableIterator<unknown>),
		),
	);

	client.onRpc((rpc) => server.provideRpc(rpc));
	client.onCall((call) => server.provideCall(call));
	server.onRpc((rpc) => client.provideRpc(rpc));
	server.onResult((result) => client.provideResult(result));
	server.provideObject(actualValue, createRpcEventId("i1"));

	const iterator = await iterated;
	for (const expected of expectedValues) {
		await expect(iterator.next()).resolves.toEqual({
			value: expected,
			done: false,
		});
	}
	await expect(iterator.next()).resolves.toEqual({
		value: undefined,
		done: true,
	});
});

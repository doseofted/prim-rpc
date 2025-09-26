import { describe, expect, test, vi } from "vitest";
import { RpcGenerator } from "./rpc-generator";

describe("RpcGenerator can handle function calls", () => {
	test("promises and iterators are resolved", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: demonstration
		const client = new RpcGenerator<any>((rpc, skip) => {
			const caught = rpc.at(-1);
			const lastMethod = caught?.method.at(-1);
			if (lastMethod === "promised") {
				return rpc;
			} else if (lastMethod === "iterated") {
				async function* generator() {
					for (const item of rpc) yield item;
				}
				return generator();
			}
			return skip;
		});

		const result1 = client.proxy.test.what.cool.promised();
		await expect(result1).resolves.toEqual([
			expect.objectContaining({
				method: ["test", "what", "cool", "promised"],
				args: [],
				id: expect.any(String),
			}),
		]);

		const result2 = result1.i.know.right.promised();
		await expect(result2).resolves.toEqual([
			expect.objectContaining({
				method: ["test", "what", "cool", "promised"],
				args: [],
				id: expect.any(String),
				chain: null,
			}),
			expect.objectContaining({
				id: expect.any(String),
				method: ["i", "know", "right", "promised"],
				args: [],
				chain: expect.any(String),
			}),
		]);

		const result3 = result2.cooler.than.that.iterated();
		const recordItemInStack = vi.fn();
		let index = 0;
		for await (const item of result3) {
			recordItemInStack(item, ++index);
		}
		expect(recordItemInStack).toHaveBeenCalledTimes(3);
		expect(recordItemInStack).toHaveBeenCalledWith(
			expect.objectContaining({
				id: expect.any(String),
				method: ["test", "what", "cool", "promised"],
				args: [],
				chain: null,
			}),
			1,
		);
		expect(recordItemInStack).toHaveBeenCalledWith(
			expect.objectContaining({
				id: expect.any(String),
				method: ["i", "know", "right", "promised"],
				args: [],
				chain: expect.any(String),
			}),
			2,
		);
		expect(recordItemInStack).toHaveBeenCalledWith(
			expect.objectContaining({
				id: expect.any(String),
				method: ["cooler", "than", "that", "iterated"],
				args: [],
				chain: expect.any(String),
			}),
			3,
		);
	});
});

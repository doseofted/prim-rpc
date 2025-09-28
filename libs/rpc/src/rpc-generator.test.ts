import { describe, expect, test, vi } from "vitest";
import { RpcGenerator } from "./rpc-generator";
import type { RpcFunctionCall } from "./types/rpc-structure";

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

	test.todo("multiple calls on the root results in unique IDs", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: demonstration
		const client = new RpcGenerator<any>((rpc) => {
			const caught = rpc.at(-1);
			const lastMethod = caught?.method.at(-1);
			if (lastMethod === "ipsum") return rpc;
		});

		const chainPath1 = client.proxy.lorem();
		const chainPath1Result = chainPath1.ipsum();
		const chainPath2 = client.proxy.lorem();
		const chainPath2Result = chainPath2.ipsum();

		async function chainedIdsAreUnique(
			...promised: Promise<RpcFunctionCall[]>[]
		) {
			const stacks = await Promise.all(promised);
			const ids = stacks.flatMap((stack) => {
				console.log("stack", stack);
				return stack.map((item) => item.id);
			});
			const idSet = new Set(ids);
			console.log(ids, idSet);
			return ids.length === idSet.size;
		}
		await expect(
			chainedIdsAreUnique(chainPath1Result, chainPath2Result),
		).resolves.toBe(true);
	});

	test("can handle multiple calls on part of a chain", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: demonstration
		const client = new RpcGenerator<any>((rpc) => {
			const caught = rpc.at(-1);
			const lastMethod = caught?.method.at(-1);
			if (lastMethod === "ipsum") return rpc;
			if (lastMethod === "bar") return rpc;
		});

		const partOfChain = client.proxy.functionCall();
		const chainPath1 = partOfChain.lorem.ipsum();
		const chainPath2 = partOfChain.foo.bar();

		await expect(chainPath1).resolves.toEqual([
			expect.objectContaining({
				id: expect.any(String),
				method: ["functionCall"],
				args: [],
				chain: null,
			}),
			expect.objectContaining({
				id: expect.any(String),
				method: ["lorem", "ipsum"],
				args: [],
				chain: expect.any(String),
			}),
		]);
		await expect(chainPath2).resolves.toEqual([
			expect.objectContaining({
				id: expect.any(String),
				method: ["functionCall"],
				args: [],
				chain: null,
			}),
			expect.objectContaining({
				id: expect.any(String),
				method: ["foo", "bar"],
				args: [],
				chain: expect.any(String),
			}),
		]);
	});
});

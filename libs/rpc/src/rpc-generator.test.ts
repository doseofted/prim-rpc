import { describe, expect, test, vi } from "vitest";
import { RpcGenerator } from "./rpc-generator";
import type { RpcFunctionCall, RpcId } from "./types/rpc-structure";

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

	test("multiple calls on the root results in unique IDs", async () => {
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
				return stack.map((item) => item.id);
			});
			const idSet = new Set(ids);
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

		// const arg = { test: 1 };
		// const test = partOfChain.test(arg).ipsum;
		// const result1 = JSON.stringify(await test(), null, 2);
		// arg.test = 2;
		// const result2 = JSON.stringify(await test(), null, 2);
		// console.log(result1, result2);
		// console.log(await chainPath1, await chainPath2);

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

describe("RpcGenerator generates expected IDs based on its configuration", () => {
	test("default ID generation works with persistent chains", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: demonstration
		const client = new RpcGenerator<any>((rpc) => {
			const caught = rpc.at(-1);
			const lastMethod = caught?.method.at(-1);
			if (lastMethod === "end") return rpc;
		});

		const chain1 = client.proxy.lorem().ipsum();
		// note that awaiting `.end()` is the same as calling `.then()` which
		// increments by 2 (meaning "7.0" will be skipped in next test)
		const end1 = await chain1.end();
		expect(end1).toEqual([
			{ id: "1.0", method: ["lorem"], new: false, args: [], chain: null },
			// increment by 2 due to property access (+1) followed by method call (+1)
			{ id: "3.0", method: ["ipsum"], new: false, args: [], chain: "1.0" },
			// increment +2 again for next method call
			{ id: "5.0", method: ["end"], new: false, args: [], chain: "3.0" },
		]);
		const chain2Split1 = chain1.foo().bar();
		const end2 = await chain2Split1.end();
		expect(end2).toEqual([
			// these IDs remain the same because we've not ended the chain
			{ id: "1.0", method: ["lorem"], new: false, args: [], chain: null },
			{ id: "3.0", method: ["ipsum"], new: false, args: [], chain: "1.0" },
			// increment +2 again for next method call
			{ id: "9.0", method: ["foo"], new: false, args: [], chain: "3.0" },
			{ id: "11.0", method: ["bar"], new: false, args: [], chain: "9.0" },
			{ id: "13.0", method: ["end"], new: false, args: [], chain: "11.0" },
		]);
		const chain2Split2 = chain1.a().z();
		const end3 = await chain2Split2.end();
		expect(end3).toEqual([
			// these IDs remain the same because we've not ended the chain
			{ id: "1.0", method: ["lorem"], new: false, args: [], chain: null },
			{ id: "3.0", method: ["ipsum"], new: false, args: [], chain: "1.0" },
			// increment +2 again for next method call
			{ id: "17.0", method: ["a"], new: false, args: [], chain: "3.0" },
			{ id: "19.0", method: ["z"], new: false, args: [], chain: "17.0" },
			{ id: "21.0", method: ["end"], new: false, args: [], chain: "19.0" },
		]);
		const newChain = client.proxy.newChain();
		const end4 = await newChain.end();
		expect(end4).toEqual([
			// we started an entirely new chain so we start with all new IDs
			{ id: "25.0", method: ["newChain"], new: false, args: [], chain: null },
			{ id: "27.0", method: ["end"], new: false, args: [], chain: "25.0" },
		]);
	});

	test("default ID generation works when part of chain is ended", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: demonstration
		const client = new RpcGenerator<any>((rpc) => {
			const caught = rpc.at(-1);
			const lastMethod = caught?.method.at(-1);
			if (lastMethod === "end") return rpc;
		});
		const chain1 = client.proxy.test();
		// awaiting `.end()` is the same as calling `.then()` which increments by 2
		// so `.end()` will get an ID of "3.0" and `.then()` will then an ID "5.0"
		const end1 = await chain1.end();
		expect(end1).toEqual([
			{ id: "1.0", method: ["test"], new: false, args: [], chain: null },
			// increment by 2 due to property access (+1) followed by method call (+1)
			{ id: "3.0", method: ["end"], new: false, args: [], chain: "1.0" },
		]);
		// we can no longer chain calls from "1.0"
		client.endChain("1.0" as RpcId);
		// again we have awaited a promise so the next ID after calling `.end()`
		// will be "11.0" because "9.0" was used to call the promise `.then()`
		const end2 = await chain1.end();
		// the next available ID after incrementing by 2 is "7.0" because we
		// awaited the promise from `.end()` which used "5.0"
		expect(end2).toEqual([
			// "1.0" is no longer available so we increment the ID to "1.1"
			{ id: "1.1", method: ["test"], new: false, args: [], chain: null },
			// we skip "5.0" because it was used to call previous promise `.then()`
			{ id: "7.0", method: ["end"], new: false, args: [], chain: "1.1" },
		]);
		const chainSplit = chain1.what();
		// we await this call so "15.0" will not be available for next explicit
		// method call
		const end3 = await chainSplit.end();
		expect(end3).toEqual([
			// we can keep using the same chain ID as last time
			{ id: "1.1", method: ["test"], new: false, args: [], chain: null },
			// we skip "9.0" because it was used to call previous promise `.then()`
			{ id: "11.0", method: ["what"], new: false, args: [], chain: "1.1" },
			// the end method increments by 2 again (and "15.0") is used with previous
			// await keyword (a `.then()` method call) so the next ID will be "17.0"
			{ id: "13.0", method: ["end"], new: false, args: [], chain: "11.0" },
		]);
		// we can no longer chain calls from "1.1"
		client.endChain(["1.1" as RpcId]);
		// "19.0" will be unavailable due to awaiting promise (calling `.then()`)
		const end4 = await chainSplit.end();
		expect(end4).toEqual([
			// the previous ID "1.1" ended so we increment to "1.2"
			{ id: "1.2", method: ["test"], new: false, args: [], chain: null },
			// "11.0" came after the ended ID "1.1" so it must also be incremented
			// (this was already called, so we increment instead of creating new ID)
			{ id: "11.1", method: ["what"], new: false, args: [], chain: "1.2" },
			// the end method increments by 2 again (and "15.0" is used with previous
			// await keyword) so incrementing will result in "17.0"
			// (this is a new ID since we called a new method on the chain)
			{ id: "17.0", method: ["end"], new: false, args: [], chain: "11.1" },
		]);
		const chainSplit2 = chainSplit.lorem().ipsum();
		client.endChain(["11.1" as RpcId]);
		const end5 = await chainSplit2.end();
		expect(end5).toEqual([
			// the previous ID "1.2" is still valid because we ended a chain after it
			{ id: "1.2", method: ["test"], new: false, args: [], chain: null },
			// "11.1" is no longer valid so we increment to "11.2"
			{ id: "11.2", method: ["what"], new: false, args: [], chain: "1.2" },
			// we called `.lorem()` prior to ending the chain so its ID will be
			// incremented to "21.1" (instead of "21.0")
			{ id: "21.1", method: ["lorem"], new: false, args: [], chain: "11.2" },
			// similar to above, we increment to "23.1" instead of "23.0"
			{ id: "23.1", method: ["ipsum"], new: false, args: [], chain: "21.1" },
			// The `.end()` method is called after ending the chain and is a new
			// method call so it gets a new ID of "25.0"
			{ id: "25.0", method: ["end"], new: false, args: [], chain: "23.1" },
		]);
	});

	test("default ID generation works when ended chain should throw errors", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: demonstration
		const client = new RpcGenerator<any>(
			(rpc) => {
				const caught = rpc.at(-1);
				const lastMethod = caught?.method.at(-1);
				if (lastMethod === "end") return rpc;
			},
			{ chainEndBehavior: "throw" },
		);
		const chain1 = client.proxy.lorem();
		const chain2 = chain1.ipsum();
		const end1 = await chain2.end();
		expect(end1).toEqual([
			{ id: "1.0", method: ["lorem"], new: false, args: [], chain: null },
			// increment by 2 due to property access (+1) followed by method call (+1)
			{ id: "3.0", method: ["ipsum"], new: false, args: [], chain: "1.0" },
			// increment +2 again for next method call
			{ id: "5.0", method: ["end"], new: false, args: [], chain: "3.0" },
		]);
		// we can no longer chain calls from "3.0"
		client.endChain("3.0" as RpcId);
		// this will work because it doesn't include "3.0"
		await expect(chain1.willNotThrow()).resolves.toBeUndefined();
		// this throws because "3.0" has been ended and can't be used on new chains
		await expect(chain2.willThrow()).rejects.toThrow(Error);
	});
});

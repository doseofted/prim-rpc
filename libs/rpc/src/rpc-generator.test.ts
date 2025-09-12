import { describe, expect, test, vi } from "vitest";
import { CaughtCallType, CaughtType } from "./call-catcher";
import { ReturnedType, RpcGenerator } from "./rpc-generator";

describe("RpcClient can handle function calls", () => {
	test("promises and iterators are resolved", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: demonstration
		const client = new RpcGenerator<any>((stack) => {
			const caught = stack.at(-1);
			const lastPath = caught.path.at(-1);
			if (lastPath === "promised") {
				return { type: ReturnedType.Promise, value: stack };
			} else if (lastPath === "iterated") {
				async function* generator() {
					for (const item of stack) yield item;
				}
				const value = generator();
				return { type: ReturnedType.Iterator, value };
			}
		});

		const result1 = client.proxy.test.what.cool.promised();
		await expect(result1).resolves.toEqual([
			expect.objectContaining({
				type: CaughtType.Call,
				callMethod: CaughtCallType.Function,
				path: ["test", "what", "cool", "promised"],
			}),
		]);

		const result2 = result1.i.know.right.promised();
		await expect(result2).resolves.toEqual([
			expect.objectContaining({
				type: CaughtType.Call,
				callMethod: CaughtCallType.Function,
				path: ["test", "what", "cool", "promised"],
				args: [],
				id: expect.any(Number),
			}),
			{
				type: CaughtType.Call,
				callMethod: CaughtCallType.Function,
				path: ["i", "know", "right", "promised"],
				args: [],
				chain: expect.any(Number),
				id: expect.any(Number),
			},
		]);
		const recordItemInStack = vi.fn();
		let index = 0;
		for await (const item of result2.cooler.than.that.iterated()) {
			recordItemInStack(item, ++index);
		}
		expect(recordItemInStack).toHaveBeenCalledTimes(3);
		expect(recordItemInStack).toHaveBeenCalledWith(
			expect.objectContaining({
				type: CaughtType.Call,
				callMethod: CaughtCallType.Function,
				path: ["test", "what", "cool", "promised"],
			}),
			1,
		);
		expect(recordItemInStack).toHaveBeenCalledWith(
			expect.objectContaining({
				type: CaughtType.Call,
				callMethod: CaughtCallType.Function,
				path: ["i", "know", "right", "promised"],
			}),
			2,
		);
		expect(recordItemInStack).toHaveBeenCalledWith(
			expect.objectContaining({
				type: CaughtType.Call,
				callMethod: CaughtCallType.Function,
				path: ["cooler", "than", "that", "iterated"],
			}),
			3,
		);
	});
});

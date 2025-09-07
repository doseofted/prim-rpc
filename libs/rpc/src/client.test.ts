import { CaughtCallType, CaughtType } from "./call-catcher";
import { describe, test, expect, vi } from "vitest";
import { RpcClient } from "./client";

describe("RpcClient can handle function calls", () => {
	test("promises and iterators are resolved", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: demonstration
		const client = new RpcClient<any>();

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
			console.log(item);
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

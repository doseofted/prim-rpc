import { isNullish } from "emery";
import { describe, expect, test, vi } from "vitest";
import { HandleEvent, PendingRpc } from "./pending-rpc";
import { RpcGenerator } from "./rpc-generator";

describe("PendingRpc works without timeout options", () => {
	test("with Call event", async () => {
		const event = HandleEvent.Call;
		const processed = vi.fn();
		const pendingRpc = new PendingRpc({ event }, (newRpc) => {
			processed();
			return newRpc.map(async (_given) => newRpc);
		});
		// biome-ignore lint/suspicious/noExplicitAny: just a test
		const rpcGenerator = new RpcGenerator<any>(
			(given) => pendingRpc.queueRpc(given),
			{ chainEndBehavior: "new" },
		);
		const chain = rpcGenerator.proxy.this.is.a;
		expect(processed).not.toHaveBeenCalled();
		const promised = chain.test();
		expect(processed).toHaveBeenCalled();
		await expect(promised).resolves.toEqual([
			expect.objectContaining({
				id: expect.any(String),
				method: ["this", "is", "a", "test"],
				args: [],
				new: false,
				chain: null,
			}),
		]);
	});

	test("with External event", async () => {
		const event = HandleEvent.External;
		const processed = vi.fn();
		const pendingRpc = new PendingRpc({ event }, (newRpc) => {
			processed();
			return newRpc.map(async (_given) => newRpc);
		});
		// biome-ignore lint/suspicious/noExplicitAny: just a test
		const rpcGenerator = new RpcGenerator<any>(
			(given) => pendingRpc.queueRpc(given),
			{ chainEndBehavior: "new" },
		);
		rpcGenerator.on("awaited", (rpc) =>
			pendingRpc.externalCall(
				rpc.map((r) => r.id).filter((given) => !isNullish(given)),
			),
		);
		const promised = rpcGenerator.proxy.this.is.a.test();
		expect(processed).not.toHaveBeenCalled();
		await expect(promised).resolves.toEqual([
			expect.objectContaining({
				id: expect.any(String),
				method: ["this", "is", "a", "test"],
				args: [],
			}),
		]);
		expect(processed).toHaveBeenCalled();
	});

	test("with Keyword event", async () => {
		const event = HandleEvent.Keyword;
		const keywords = ["test"];
		const processed = vi.fn();
		const pendingRpc = new PendingRpc({ event, keywords }, (newRpc) => {
			processed();
			return newRpc.map(async (_given) => newRpc);
		});
		// biome-ignore lint/suspicious/noExplicitAny: just a test
		const rpcGenerator = new RpcGenerator<any>(
			(given) => pendingRpc.queueRpc(given),
			{ chainEndBehavior: "new" },
		);
		const chain = rpcGenerator.proxy.this.is.a;
		expect(processed).not.toHaveBeenCalled();
		const promised = chain.test();
		expect(processed).toHaveBeenCalled();
		await expect(promised).resolves.toEqual([
			expect.objectContaining({
				id: expect.any(String),
				method: ["this", "is", "a", "test"],
				args: [],
				new: false,
				chain: null,
			}),
		]);
	});
});

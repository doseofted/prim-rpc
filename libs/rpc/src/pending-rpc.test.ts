import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { HandleEvent, type HandleOnOptions, PendingRpc } from "./pending-rpc";
import { RpcGenerator } from "./rpc-generator";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

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
		rpcGenerator.on("awaited", (ids) => pendingRpc.externalCall(ids));
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
			}),
		]);
	});
});

describe("PendingRpc works with timeout enabled per chain", () => {
	test("with Call event", async () => {
		const options = {
			event: HandleEvent.Call,
			timeoutAppliesOn: "chain",
			timeoutBatch: 300,
		} satisfies HandleOnOptions;
		const processed = vi.fn();
		const pendingRpc = new PendingRpc(options, (newRpc) => {
			processed();
			return newRpc.map(async (_given) => newRpc);
		});
		// biome-ignore lint/suspicious/noExplicitAny: just a test
		const rpcGenerator = new RpcGenerator<any>(
			(given) => pendingRpc.queueRpc(given),
			{ chainEndBehavior: "new" },
		);
		const existingChain1 = rpcGenerator.proxy.test();
		const promised1 = new Promise((resolve) =>
			setTimeout(() => {
				// has no effect on other chain
				resolve(rpcGenerator.proxy.separate().chain());
			}, 100),
		);
		const promised2 = new Promise((resolve) =>
			setTimeout(() => {
				// this will reset timer for existingChain1
				resolve(existingChain1.lorem().ipsum());
			}, 200),
		);
		vi.advanceTimersByTime(100);
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100); // timer was reset, so we wait another 300
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100); // separate chain reaches timeout
		expect(processed).toHaveBeenCalled();
		await expect(promised1).resolves.toEqual([
			expect.objectContaining({ method: ["separate"] }),
			expect.objectContaining({ method: ["chain"] }),
		]);
		vi.advanceTimersByTime(100); // we waited 200, we have to wait another 100
		expect(processed).toHaveBeenCalled();
		await expect(promised2).resolves.toEqual([
			expect.objectContaining({ method: ["test"] }),
			expect.objectContaining({ method: ["lorem"] }),
			expect.objectContaining({ method: ["ipsum"] }),
		]);
	});

	test("with External event", async () => {
		const options = {
			event: HandleEvent.External,
			timeoutAppliesOn: "chain",
			timeoutBatch: 300,
		} satisfies HandleOnOptions;
		const processed = vi.fn();
		const pendingRpc = new PendingRpc(options, (newRpc) => {
			processed();
			return newRpc.map(async (_given) => newRpc);
		});
		// biome-ignore lint/suspicious/noExplicitAny: just a test
		const rpcGenerator = new RpcGenerator<any>(
			(given) => pendingRpc.queueRpc(given),
			{ chainEndBehavior: "new" },
		);
		rpcGenerator.on("awaited", (ids) => pendingRpc.externalCall(ids));
		const existingChain1 = rpcGenerator.proxy.test();
		expect(processed).not.toHaveBeenCalled();
		// biome-ignore lint/suspicious/noExplicitAny: just a test
		void existingChain1.then((given: any) => given);
		vi.advanceTimersByTime(100);
		// biome-ignore lint/suspicious/noExplicitAny: just a test
		const awaiting2 = existingChain1.another().then((given: any) => given);
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(200); // would have been called but we make another promise
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100); // now it times out
		expect(processed).toHaveBeenCalled();
		// both have been batched and should now be available
		await expect(awaiting2).resolves.toEqual([
			expect.objectContaining({
				method: ["test"],
			}),
			expect.objectContaining({
				method: ["another"],
			}),
		]);
	});

	test("with Keyword event", async () => {
		const options = {
			event: HandleEvent.Keyword,
			keywords: ["test"],
			timeoutAppliesOn: "chain",
			timeoutBatch: 300,
		} satisfies HandleOnOptions;
		const processed = vi.fn();
		const pendingRpc = new PendingRpc(options, (newRpc) => {
			processed();
			return newRpc.map(async (_given) => newRpc);
		});
		// biome-ignore lint/suspicious/noExplicitAny: just a test
		const rpcGenerator = new RpcGenerator<any>(
			(given) => pendingRpc.queueRpc(given),
			{ chainEndBehavior: "new" },
		);
		const existingChain1 = rpcGenerator.proxy.this.is.a;
		expect(processed).not.toHaveBeenCalled();
		const promised1 = existingChain1.test();
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(200); // timer has not yet expired
		const promised2 = promised1.and.another.test(); // cancel previous timer
		vi.advanceTimersByTime(200); // timer was reset, so still not called
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100); // now it times out
		expect(processed).toHaveBeenCalled();
		await expect(promised2).resolves.toEqual([
			expect.objectContaining({
				id: expect.any(String),
				method: ["this", "is", "a", "test"],
				args: [],
			}),
			expect.objectContaining({
				id: expect.any(String),
				method: ["and", "another", "test"],
				args: [],
			}),
		]);
	});
});

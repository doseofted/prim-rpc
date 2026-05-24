import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { HandleEvent, type HandleOnOptions, PendingRpc } from "./pending-rpc";
import { RpcGenerator } from "./rpc-generator";
import { UnknownAsyncError } from "./unknown-async";

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

describe("PendingRpc works when chain is continued after already being partially processed", () => {
	test("without a timeout", async () => {
		const event = HandleEvent.Keyword;
		const keywords = ["test"];
		const processed = vi.fn();
		const pendingRpc = new PendingRpc(
			{ event, keywords },
			(newRpc, _skip, allRpc) => {
				processed(allRpc);
				return newRpc.map(async (given) => given);
			},
		);
		// biome-ignore lint/suspicious/noExplicitAny: just a test
		const rpcGenerator = new RpcGenerator<any>(
			(given) => pendingRpc.queueRpc(given),
			{ chainEndBehavior: "new" },
		);
		const existingChain = rpcGenerator.proxy.this.is.a.test();
		expect(processed).toHaveBeenCalledTimes(1);
		expect(processed).toHaveBeenCalledWith([
			expect.objectContaining({
				id: expect.any(String),
				method: ["this", "is", "a", "test"],
				args: [],
			}),
		]);
		await expect(existingChain).resolves.toEqual(
			expect.objectContaining({
				id: expect.any(String),
				method: ["this", "is", "a", "test"],
				args: [],
			}),
		);
		const continuedChain = existingChain.and.another.test();
		expect(processed).toHaveBeenCalledTimes(2);
		expect(processed).toHaveBeenCalledWith([
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
		await expect(continuedChain).resolves.toEqual(
			expect.objectContaining({
				id: expect.any(String),
				method: ["and", "another", "test"],
				args: [],
			}),
		);
	});

	test("with a timeout", async () => {
		const options = {
			event: HandleEvent.Keyword,
			keywords: ["test"],
			timeoutAppliesOn: "chain",
			timeoutBatch: 300,
		} satisfies HandleOnOptions;
		const processed = vi.fn();
		const pendingRpc = new PendingRpc(options, (newRpc, _skip, allRpc) => {
			processed(allRpc);
			return newRpc.map(async (given) => given);
		});
		// biome-ignore lint/suspicious/noExplicitAny: just a test
		const rpcGenerator = new RpcGenerator<any>(
			(given) => pendingRpc.queueRpc(given),
			{ chainEndBehavior: "new" },
		);
		const existingChain = rpcGenerator.proxy.this.is.a.test();
		const continuedChain = new Promise((resolve) => {
			setTimeout(() => {
				resolve(existingChain.and.another.test());
			}, 100);
		});
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(300);
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100); // now it times out
		expect(processed).toHaveBeenCalledTimes(1);
		expect(processed).toHaveBeenCalledWith([
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
		await expect(existingChain).resolves.toEqual(
			expect.objectContaining({
				id: expect.any(String),
				method: ["this", "is", "a", "test"],
				args: [],
			}),
		);
		expect(processed).toHaveBeenCalledTimes(1); // no new calls, chain was batched
		await expect(continuedChain).resolves.toEqual(
			expect.objectContaining({
				id: expect.any(String),
				method: ["and", "another", "test"],
				args: [],
			}),
		);
	});
});

describe("PendingRpc works with timeout enabled per chain (local)", () => {
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
		expect(processed).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(100); // we waited 200, we have to wait another 100
		expect(processed).toHaveBeenCalledTimes(2);
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

describe("PendingRpc works with timeout enabled per call (global)", () => {
	test("with Call event", async () => {
		const options = {
			event: HandleEvent.Call,
			timeoutAppliesOn: "call",
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
		const existingChain1 = rpcGenerator.proxy.im.a.teapot();
		const result = new Promise((resolve1) => {
			const resolvedInner = new Promise((resolve2) => {
				setTimeout(() => {
					resolve2(existingChain1.pour.me.out());
				}, 100);
			});
			setTimeout(() => {
				const existingChain2 = rpcGenerator.proxy.im.a.cup();
				setTimeout(() => {
					const resolvedSecond = existingChain2.do.not.spill();
					Promise.all([resolvedInner, resolvedSecond]).then(resolve1);
				}, 100);
			}, 100);
		});
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100); // all calls have been made at 200ms mark
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100); // finished making calls, not executed yet
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100); // global timer is still running
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100); // now it times out (+300ms since last call)
		expect(processed).toHaveBeenCalled();
		expect(await result).toEqual([
			[
				expect.objectContaining({ method: ["im", "a", "teapot"] }),
				expect.objectContaining({ method: ["pour", "me", "out"] }),
			],
			[
				expect.objectContaining({ method: ["im", "a", "cup"] }),
				expect.objectContaining({ method: ["do", "not", "spill"] }),
			],
		]);
	});

	test("with External event", async () => {
		const options = {
			event: HandleEvent.External,
			timeoutAppliesOn: "call",
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
		const result = new Promise((resolve1) => {
			const resolvedInner = new Promise((resolve2) => {
				// biome-ignore lint/suspicious/noExplicitAny: just a test
				existingChain1.then((given: any) => given);
				setTimeout(() => {
					resolve2(
						existingChain1
							.keep()
							.testing()
							// biome-ignore lint/suspicious/noExplicitAny: just a test
							.then((given: any) => given),
					);
				}, 100);
			});
			setTimeout(() => {
				const resolvedSecond = rpcGenerator.proxy.another
					.chain()
					// biome-ignore lint/suspicious/noExplicitAny: just a test
					.then((given: any) => given);
				Promise.all([resolvedInner, resolvedSecond]).then(resolve1);
			}, 200);
		});
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(200);
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(processed).toHaveBeenCalled();
		expect(await result).toEqual([
			[
				expect.objectContaining({ method: ["test"] }),
				expect.objectContaining({ method: ["keep"] }),
				expect.objectContaining({ method: ["testing"] }),
			],
			[expect.objectContaining({ method: ["another", "chain"] })],
		]);
	});

	test("with Keyword event", async () => {
		const options = {
			event: HandleEvent.Keyword,
			keywords: ["test"],
			timeoutAppliesOn: "call",
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
		const result = new Promise((resolve1) => {
			const resolvedInner = new Promise((resolve2) => {
				const promised1 = existingChain1.test();
				setTimeout(() => {
					resolve2(promised1.and.another.test());
				}, 100);
			});
			setTimeout(() => {
				const existingChain2 = rpcGenerator.proxy.different.test();
				setTimeout(() => {
					const resolvedSecond = existingChain2.another.test();
					Promise.all([resolvedInner, resolvedSecond]).then(resolve1);
				}, 100);
			}, 100);
		});
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100); // all calls have been made at 200ms mark
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100); // finished making calls, not executed yet
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100); // global timer is still running
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100); // now it times out (+300ms since last call)
		expect(processed).toHaveBeenCalled();
		expect(await result).toEqual([
			[
				expect.objectContaining({ method: ["this", "is", "a", "test"] }),
				expect.objectContaining({ method: ["and", "another", "test"] }),
			],
			[
				expect.objectContaining({ method: ["different", "test"] }),
				expect.objectContaining({ method: ["another", "test"] }),
			],
		]);
	});
});

describe("PendingRpc works with leading timeout per chain (local)", () => {
	test("with Call event", async () => {
		const options = {
			event: HandleEvent.Call,
			timeoutAppliesOn: "chain",
			timeoutBatch: 300,
			timeoutEdge: "both",
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
		// First call fires immediately (leading edge)
		const chain1 = rpcGenerator.proxy.hello();
		expect(processed).toHaveBeenCalledTimes(1);
		// Extend the chain during cooldown — batched, not fired
		const continued = new Promise((resolve) =>
			setTimeout(() => {
				resolve(chain1.world());
			}, 100),
		);
		vi.advanceTimersByTime(100);
		expect(processed).toHaveBeenCalledTimes(1); // still in cooldown
		// Trailing flush (300ms after last call in this chain)
		vi.advanceTimersByTime(300);
		expect(processed).toHaveBeenCalledTimes(2);
		// Trailing batch only contains the new, unhandled RPC
		await expect(continued).resolves.toEqual([
			expect.objectContaining({ method: ["world"] }),
		]);
	});

	test("with Keyword event", async () => {
		const options = {
			event: HandleEvent.Keyword,
			keywords: ["end"],
			timeoutAppliesOn: "chain",
			timeoutBatch: 300,
			timeoutEdge: "both",
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
		// First keyword match fires immediately (leading edge)
		const chain1 = rpcGenerator.proxy.hello.end();
		expect(processed).toHaveBeenCalledTimes(1);
		// Continue the chain during cooldown — batched
		const continued = new Promise((resolve) =>
			setTimeout(() => {
				resolve(chain1.world.end());
			}, 100),
		);
		vi.advanceTimersByTime(100);
		expect(processed).toHaveBeenCalledTimes(1); // cooldown still active
		// Trailing flush (300ms after continuation)
		vi.advanceTimersByTime(300);
		expect(processed).toHaveBeenCalledTimes(2);
		await expect(continued).resolves.toEqual([
			expect.objectContaining({ method: ["world", "end"] }),
		]);
	});
});

describe("PendingRpc works with leading timeout per call (global)", () => {
	test("with Call event", async () => {
		const options = {
			event: HandleEvent.Call,
			timeoutAppliesOn: "call",
			timeoutBatch: 300,
			timeoutEdge: "both",
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
		// Very first call fires immediately (global leading edge)
		rpcGenerator.proxy.hello();
		expect(processed).toHaveBeenCalledTimes(1);
		// A second, separate call during global cooldown — batched
		const promised = new Promise((resolve) =>
			setTimeout(() => {
				resolve(rpcGenerator.proxy.world());
			}, 100),
		);
		vi.advanceTimersByTime(100);
		expect(processed).toHaveBeenCalledTimes(1); // global cooldown
		// Trailing flush (300ms after the last global call)
		vi.advanceTimersByTime(300);
		expect(processed).toHaveBeenCalledTimes(2);
		await expect(promised).resolves.toEqual([
			expect.objectContaining({ method: ["world"] }),
		]);
	});

	test("with Keyword event", async () => {
		const options = {
			event: HandleEvent.Keyword,
			keywords: ["test"],
			timeoutAppliesOn: "call",
			timeoutBatch: 300,
			timeoutEdge: "both",
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
		// First keyword match fires immediately (global leading)
		rpcGenerator.proxy.this.is.a.test();
		expect(processed).toHaveBeenCalledTimes(1);
		// Second chain during global cooldown — batched
		const promised = new Promise((resolve) =>
			setTimeout(() => {
				resolve(rpcGenerator.proxy.different.test());
			}, 100),
		);
		vi.advanceTimersByTime(100);
		expect(processed).toHaveBeenCalledTimes(1); // cooldown
		// Trailing flush
		vi.advanceTimersByTime(300);
		expect(processed).toHaveBeenCalledTimes(2);
		await expect(promised).resolves.toEqual([
			expect.objectContaining({ method: ["different", "test"] }),
		]);
	});
});

describe("PendingRpc works with throttle timeout per chain (local)", () => {
	test("with Call event", async () => {
		const options = {
			event: HandleEvent.Call,
			timeoutAppliesOn: "chain",
			timeoutBatch: 300,
			timeoutStyle: "throttle",
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
		const promised2 = new Promise((resolve) =>
			setTimeout(() => {
				// extends chain at 200ms — must not reset the 300ms window
				resolve(existingChain1.lorem().ipsum());
			}, 200),
		);
		vi.advanceTimersByTime(200);
		expect(processed).not.toHaveBeenCalled();
		// original window from t=0 fires at 300ms (not 500ms as with debounce)
		vi.advanceTimersByTime(100);
		expect(processed).toHaveBeenCalledTimes(1);
		await expect(promised2).resolves.toEqual([
			expect.objectContaining({ method: ["test"] }),
			expect.objectContaining({ method: ["lorem"] }),
			expect.objectContaining({ method: ["ipsum"] }),
		]);
	});

	test("with Keyword event", async () => {
		const options = {
			event: HandleEvent.Keyword,
			keywords: ["test"],
			timeoutAppliesOn: "chain",
			timeoutBatch: 300,
			timeoutStyle: "throttle",
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
		const promised1 = existingChain1.test();
		const promised2 = new Promise((resolve) =>
			setTimeout(() => {
				resolve(promised1.and.another.test());
			}, 200),
		);
		vi.advanceTimersByTime(200);
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(processed).toHaveBeenCalledTimes(1);
		await expect(promised2).resolves.toEqual([
			expect.objectContaining({ method: ["this", "is", "a", "test"] }),
			expect.objectContaining({ method: ["and", "another", "test"] }),
		]);
	});
});

describe("PendingRpc works with throttle timeout per call (global)", () => {
	test("with Call event", async () => {
		const options = {
			event: HandleEvent.Call,
			timeoutAppliesOn: "call",
			timeoutBatch: 300,
			timeoutStyle: "throttle",
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
		const existingChain1 = rpcGenerator.proxy.im.a.teapot();
		const result = new Promise((resolve1) => {
			const resolvedInner = new Promise((resolve2) => {
				setTimeout(() => {
					resolve2(existingChain1.pour.me.out());
				}, 100);
			});
			setTimeout(() => {
				const existingChain2 = rpcGenerator.proxy.im.a.cup();
				setTimeout(() => {
					const resolvedSecond = existingChain2.do.not.spill();
					Promise.all([resolvedInner, resolvedSecond]).then(resolve1);
				}, 100);
			}, 100);
		});
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(200);
		expect(processed).not.toHaveBeenCalled();
		// global window from first call fires at 300ms, not 500ms
		vi.advanceTimersByTime(100);
		expect(processed).toHaveBeenCalled();
		expect(await result).toEqual([
			[
				expect.objectContaining({ method: ["im", "a", "teapot"] }),
				expect.objectContaining({ method: ["pour", "me", "out"] }),
			],
			[
				expect.objectContaining({ method: ["im", "a", "cup"] }),
				expect.objectContaining({ method: ["do", "not", "spill"] }),
			],
		]);
	});

	test("with Keyword event", async () => {
		const options = {
			event: HandleEvent.Keyword,
			keywords: ["test"],
			timeoutAppliesOn: "call",
			timeoutBatch: 300,
			timeoutStyle: "throttle",
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
		const result = new Promise((resolve1) => {
			const resolvedInner = new Promise((resolve2) => {
				const promised1 = existingChain1.test();
				setTimeout(() => {
					resolve2(promised1.and.another.test());
				}, 100);
			});
			setTimeout(() => {
				const existingChain2 = rpcGenerator.proxy.different.test();
				setTimeout(() => {
					const resolvedSecond = existingChain2.another.test();
					Promise.all([resolvedInner, resolvedSecond]).then(resolve1);
				}, 100);
			}, 100);
		});
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(200);
		expect(processed).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(processed).toHaveBeenCalled();
		expect(await result).toEqual([
			[
				expect.objectContaining({ method: ["this", "is", "a", "test"] }),
				expect.objectContaining({ method: ["and", "another", "test"] }),
			],
			[
				expect.objectContaining({ method: ["different", "test"] }),
				expect.objectContaining({ method: ["another", "test"] }),
			],
		]);
	});
});

describe("PendingRpc works with throttle + leading edge per chain (local)", () => {
	test("with Call event", async () => {
		const options = {
			event: HandleEvent.Call,
			timeoutAppliesOn: "chain",
			timeoutBatch: 300,
			timeoutStyle: "throttle",
			timeoutEdge: "leading",
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
		const chain1 = rpcGenerator.proxy.hello();
		expect(processed).toHaveBeenCalledTimes(1);
		const continued = new Promise((resolve) =>
			setTimeout(() => {
				resolve(chain1.world());
			}, 100),
		);
		vi.advanceTimersByTime(100);
		expect(processed).toHaveBeenCalledTimes(1);
		// leading-only: no trailing flush at window end
		vi.advanceTimersByTime(300);
		expect(processed).toHaveBeenCalledTimes(1);
		void continued;
	});
});

describe("PendingRpc works with throttle + both edges per chain (local)", () => {
	test("with Call event", async () => {
		const options = {
			event: HandleEvent.Call,
			timeoutAppliesOn: "chain",
			timeoutBatch: 300,
			timeoutStyle: "throttle",
			timeoutEdge: "both",
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
		const chain1 = rpcGenerator.proxy.hello();
		expect(processed).toHaveBeenCalledTimes(1);
		const continued = new Promise((resolve) =>
			setTimeout(() => {
				resolve(chain1.world());
			}, 100),
		);
		vi.advanceTimersByTime(100);
		expect(processed).toHaveBeenCalledTimes(1);
		// fixed window from first call (throttle), trailing flush at 300ms
		vi.advanceTimersByTime(200);
		expect(processed).toHaveBeenCalledTimes(2);
		await expect(continued).resolves.toEqual([
			expect.objectContaining({ method: ["world"] }),
		]);
	});
});

describe("PendingRpc works with throttle + leading edge per call (global)", () => {
	test("with Call event", async () => {
		const options = {
			event: HandleEvent.Call,
			timeoutAppliesOn: "call",
			timeoutBatch: 300,
			timeoutStyle: "throttle",
			timeoutEdge: "leading",
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
		rpcGenerator.proxy.hello();
		expect(processed).toHaveBeenCalledTimes(1);
		const promised = new Promise((resolve) =>
			setTimeout(() => {
				resolve(rpcGenerator.proxy.world());
			}, 100),
		);
		vi.advanceTimersByTime(100);
		expect(processed).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(300);
		expect(processed).toHaveBeenCalledTimes(1);
		void promised;
	});
});

describe("PendingRpc works with throttle + both edges per call (global)", () => {
	test("with Call event", async () => {
		const options = {
			event: HandleEvent.Call,
			timeoutAppliesOn: "call",
			timeoutBatch: 300,
			timeoutStyle: "throttle",
			timeoutEdge: "both",
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
		rpcGenerator.proxy.hello();
		expect(processed).toHaveBeenCalledTimes(1);
		const promised = new Promise((resolve) =>
			setTimeout(() => {
				resolve(rpcGenerator.proxy.world());
			}, 100),
		);
		vi.advanceTimersByTime(100);
		expect(processed).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(200);
		expect(processed).toHaveBeenCalledTimes(2);
		await expect(promised).resolves.toEqual([
			expect.objectContaining({ method: ["world"] }),
		]);
	});
});

test("Original skip symbol is returned back to caller", async () => {
	const event = HandleEvent.Call;
	const pendingRpc = new PendingRpc({ event }, (newRpc, skip) => {
		return newRpc.map(async (_given) => skip);
	});
	// biome-ignore lint/suspicious/noExplicitAny: just a test
	const rpcGenerator = new RpcGenerator<any>(
		(given, skip) => pendingRpc.queueRpc(given, skip),
		{ chainEndBehavior: "new" },
	);
	// biome-ignore lint/suspicious/noExplicitAny: just a test
	const catchIteratorRejection = async (promised: any) => {
		try {
			await promised?.next?.();
		} catch {
			// no-op
		}
	};
	const promise1 = rpcGenerator.proxy.just();
	void catchIteratorRejection(promise1);
	const promise2 = promise1.a();
	void catchIteratorRejection(promise2);
	const promise3 = promise2.test();
	void catchIteratorRejection(promise3);

	await expect(promise1).rejects.toBeInstanceOf(UnknownAsyncError);
	await expect(promise1).rejects.toThrowError("Given was not a promise");
	await expect(promise2).rejects.toBeInstanceOf(UnknownAsyncError);
	await expect(promise2).rejects.toThrowError("Given was not a promise");
	await expect(promise3).rejects.toBeInstanceOf(UnknownAsyncError);
	await expect(promise3).rejects.toThrowError("Given was not a promise");
});

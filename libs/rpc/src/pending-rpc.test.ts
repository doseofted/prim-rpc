import { isNullish } from "emery";
import { describe, test } from "vitest";
import { HandleEvent, PendingRpc } from "./pending-rpc";
import { RpcGenerator } from "./rpc-generator";

// TODO: add tests, this is just to ensure the basic functionality works
describe.todo("PendingRpc works", () => {
	test("it queues RPCs", async () => {
		// TODO: determine if pending RPC should be utilized by RpcGenerator or
		// if it should remain separate from it
		const pendingRpc = new PendingRpc(
			{ event: HandleEvent.External },
			(newRpc, chain) => {
				console.log({ newRpc, chain });
				return newRpc.map(async (given) => {
					return given;
				});
			},
		);
		// biome-ignore lint/suspicious/noExplicitAny: just a test
		const rpcGenerator = new RpcGenerator<any>(
			(given) => pendingRpc.queueRpc(given),
			{
				chainEndBehavior: "new",
				// TODO: ".then()" is not recorded as RPC so I need to send event from
				// generator when await happens (instead of using "await" event)
				// handleOn: { event: "call" },
			},
		);
		rpcGenerator.on("awaited", (rpc) =>
			pendingRpc.externalCall(
				rpc.map((r) => r.id).filter((given) => !isNullish(given)),
			),
		);
		const a = rpcGenerator.proxy.a().test();
		await a;
		await a.what().test();
	});
});

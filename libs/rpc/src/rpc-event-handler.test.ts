import { expect, test } from "vitest";
import { ReconstructedPromise } from "./reconstructed/promise";
import { RpcEventHandler } from "./rpc-event-handler-attempt-1";
import {
	RpcTypeDeconstructPromise,
	RpcTypeReconstructPromise,
} from "./rpc-event-handler-attempt-2";
import { createRpcEventId } from "./types/rpc-structure";

test("Attempt 1: RpcEventHandler emits events", async () => {
	const reconstructedPromise = new ReconstructedPromise();
	const handler = new RpcEventHandler("p1");
	handler.onEmittedRpc((message) => {
		if (message.event === "resolved") {
			reconstructedPromise.admin.resolve(message.result);
		}
		if (message.event === "rejected") {
			reconstructedPromise.admin.reject(message.error);
		}
	});
	const promised = Promise.resolve(123);
	try {
		const value = await promised;
		handler.emitValue("resolved", value);
	} catch (error) {
		handler.emitError("rejected", error);
	}
	const promisedReplaced = reconstructedPromise.value;
	await expect(promisedReplaced).resolves.toBe(123);
});

test("Attempt 2: RpcTypePromise reconstruct and deconstruct classes work together", async () => {
	const id = createRpcEventId("p1");
	const deconstructed = new RpcTypeDeconstructPromise(id);
	const reconstructed = new RpcTypeReconstructPromise(id);
	deconstructed.onDeconstructEvent((rpc) => {
		reconstructed.emitReconstructEvent(rpc);
	});
	deconstructed.deconstruct(Promise.resolve(123));
	await expect(reconstructed.value).resolves.toBe(123);
});

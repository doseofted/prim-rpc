import { ReconstructedPromise } from "../reconstructed/promise";
import { createRpcType, type RpcTypeConstructor } from ".";

type Expected = Promise<unknown>;
type Context = {
	promised: null | ReconstructedPromise<unknown>;
};
type Events = "resolve" | "reject";

export type RpcTypePromise = RpcTypeConstructor<Expected, Context, Events>;
export const RpcTypePromise: RpcTypePromise = createRpcType({
	reconstruct(rpc, emit, ctx) {
		if (!ctx.promised) {
			ctx.promised = new ReconstructedPromise();
			emit(ctx.promised.value);
		}
		if (rpc.event === "resolve") {
			ctx.promised.admin.resolve(rpc.result);
		}
		if (rpc.event === "reject") {
			ctx.promised.admin.reject(rpc.error);
		}
	},
	async deconstruct(value, emit) {
		try {
			const result = await value;
			emit({ event: "resolve", result });
		} catch (error) {
			emit({ event: "reject", error });
		}
	},
});

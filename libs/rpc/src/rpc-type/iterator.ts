import { createCaughtId } from "../call-catcher";
import { ReconstructedIterator } from "../reconstructed/iterator";
import type {
	RpcEventId,
	RpcFunctionCall,
	RpcFunctionResult,
	RpcId,
} from "../types/rpc-structure";
import { createRpcId } from "../types/rpc-structure";
import { IteratorType, isIterator } from "../utils/is-iterable";
import { createRpcType, type RpcTypeConstructor } from ".";

type Expected = Iterator<unknown> | AsyncIterableIterator<unknown>;
type IteratorMethod = "next" | "return" | "throw";
type Context = {
	eventId: RpcEventId | null;
	source: AsyncIterableIterator<unknown> | null;
	iterated: ReconstructedIterator | null;
	nextCallId: number;
	pending: Map<RpcId, PendingHandler>;
};
type Events = "init";
type PendingHandler = {
	resolve: (value: IteratorResult<unknown>) => void;
	reject: (reason?: unknown) => void;
};

export type RpcTypeIterator = RpcTypeConstructor<Expected, Context, Events>;
export const RpcTypeIterator: RpcTypeIterator = createRpcType<
	Expected,
	Context,
	Events
>({
	reconstruct(rpc, emit, _emitRpc, emitCall, ctx) {
		if (rpc.event !== "init") return;
		if (!ctx.eventId) ctx.eventId = rpc.id;
		setupReconstructedIterator(emit, emitCall, ctx);
	},
	handleCall(call, emitResult, ctx) {
		if (!ctx.source || call.chain !== ctx.eventId) return;
		const method = getIteratorMethod(call);
		if (!method) return;
		void handleIteratorCall(call, method, emitResult, ctx.source);
	},
	handleResult(result, ctx) {
		resolveIteratorResult(result, ctx);
	},
	deconstruct(value, emit, ctx, eventId) {
		ctx.source = asAsyncIterator(value);
		ctx.eventId = eventId;
		ctx.iterated = null;
		ctx.nextCallId = 0;
		ctx.pending = new Map();
		emit({ event: "init" });
	},
	allowSchema: {
		next: true,
		return: true,
		throw: true,
		[Symbol.asyncIterator]: true,
	},
});

function setupReconstructedIterator(
	emit: (provided: AsyncIterableIterator<unknown>) => void,
	emitCall: (call: RpcFunctionCall) => void,
	ctx: Context,
) {
	if (ctx.iterated) return;
	ctx.pending = new Map();
	ctx.iterated = new ReconstructedIterator();
	for (const method of ["next", "return", "throw"] as const) {
		ctx.iterated.admin[`on${capitalize(method)}`](
			async (...args: unknown[]) => {
				const callId = createRpcId(createCaughtId(ctx.nextCallId++));
				emitCall({
					id: callId,
					method,
					args,
					chain: ctx.eventId ?? undefined,
				});
				return new Promise<IteratorResult<unknown>>((resolve, reject) => {
					ctx.pending.set(callId, { resolve, reject });
				});
			},
		);
	}
	emit(ctx.iterated.value);
}

async function handleIteratorCall(
	call: RpcFunctionCall,
	method: IteratorMethod,
	emitResult: (result: RpcFunctionResult) => void,
	source: AsyncIterableIterator<unknown>,
) {
	if (!call.id) {
		throw new Error("Iterator RPC call is missing an id");
	}
	try {
		const iteratorMethod = source[method] as (
			...args: unknown[]
		) => IteratorResult<unknown> | Promise<IteratorResult<unknown>>;
		const result = await iteratorMethod.apply(source, call.args);
		emitResult({ id: call.id, result });
	} catch (error) {
		emitResult({ id: call.id, error });
	}
}

function resolveIteratorResult(result: RpcFunctionResult, ctx: Context) {
	if (!result.id) {
		throw new Error("Iterator RPC result is missing an id");
	}
	const pending = ctx.pending.get(result.id);
	if (!pending) {
		throw new Error(`No pending iterator call for result id '${result.id}'`);
	}
	ctx.pending.delete(result.id);
	if (result.error !== undefined) {
		pending.reject(result.error);
		return;
	}
	pending.resolve(result.result as IteratorResult<unknown>);
}

function getIteratorMethod(call: RpcFunctionCall): IteratorMethod | null {
	const methodName =
		typeof call.method === "string" ? call.method : call.method.at(-1);
	if (
		methodName === "next" ||
		methodName === "return" ||
		methodName === "throw"
	) {
		return methodName;
	}
	return null;
}

function capitalize(method: IteratorMethod): "Next" | "Return" | "Throw" {
	return (method.charAt(0).toUpperCase() + method.slice(1)) as
		| "Next"
		| "Return"
		| "Throw";
}

function asAsyncIterator(value: Expected): AsyncIterableIterator<unknown> {
	if (isIterator(value, IteratorType.Sync)) {
		const sync = value as Iterator<unknown>;
		return {
			[Symbol.asyncIterator]() {
				return this;
			},
			next: async (...args: unknown[]) =>
				Promise.resolve(sync.next(...(args as Parameters<typeof sync.next>))),
			return: async (...args: unknown[]) =>
				Promise.resolve(
					sync.return?.(
						...(args as Parameters<NonNullable<typeof sync.return>>),
					) ?? { done: true, value: undefined },
				),
			throw: async (...args: unknown[]) => {
				if (sync.throw)
					return Promise.resolve(
						sync.throw(...(args as Parameters<NonNullable<typeof sync.throw>>)),
					);
				throw args[0];
			},
		};
	}
	return value as AsyncIterableIterator<unknown>;
}

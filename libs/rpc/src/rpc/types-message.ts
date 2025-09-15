import { castToOpaque, type Opaque } from "emery";

const RpcIdSymbol: unique symbol = Symbol();
export type RpcId = Opaque<number, typeof RpcIdSymbol>;
export function createRpcId(id: number): RpcId {
	return castToOpaque<RpcId>(id);
}

/**
 * An RPC is the function call represented as a message that can be sent.
 * It is the result of calling a function or may be called as a result of
 * calling another function. It may be called from the client (a function call
 * on an expected module) or from the server (by calling a callback passed from
 * the client).
 */
export type RpcFunctionCall<Args extends unknown[] = unknown[]> = {
	id?: RpcId | null;
	method: string | string[];
	args: Args;
	chain?: RpcId | null;
};

/**
 * An RPC function result is returned from an RPC which is created from a
 * function call.
 */
export type RpcFunctionResult<Result = unknown, Error = unknown> = {
	id?: RpcId;
	result?: Result;
	error?: Error;
};

const RpcEventIdSymbol: unique symbol = Symbol();
export type RpcEventId = Opaque<number, typeof RpcEventIdSymbol>;
export function createRpcEventId(id: number): RpcEventId {
	return castToOpaque<RpcEventId>(id);
}

/**
 * RPC events happen inside of arguments, returned or thrown values, or inside
 * of other events. They are either events that happen either over time or are
 * values that are not directly (or usefully or conveniently) serializable.
 *
 * It is essentially the same as a returned value but the ID of the event is
 * given in the RPC's arguments, returned or thrown value, or another event.
 *
 * The ID of an RPC may communicate details about its value including its type
 * and may be used to parse the value into its expected form.
 */
export type RpcEvent<Result = unknown, Error = unknown> = Omit<
	RpcFunctionResult<Result, Error>,
	"id"
> & {
	id: RpcEventId;
};

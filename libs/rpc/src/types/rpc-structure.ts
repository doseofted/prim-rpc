import { castToOpaque, type Opaque } from "emery";
import type { CaughtId } from "../call-catcher";

const RpcIdSymbol: unique symbol = Symbol();
export type RpcId = Opaque<string, typeof RpcIdSymbol>;
export function createRpcId(id: CaughtId): RpcId {
	return castToOpaque<RpcId>(id.toString());
}

/**
 * An RPC is the function call represented as a message that can be sent.
 * It is the result of calling a function or may be called as a result of
 * calling another function. It may be called from the client (a function call
 * on an expected module) or from the server (by calling a callback passed from
 * the client).
 */
export type RpcFunctionCall<Args extends unknown[] = unknown[]> = {
	/** An ID is used to match a function call with a result */
	id?: RpcId | null;
	/** The method refers to the path of a function on an object */
	method: string | string[];
	/** Arguments serialized into form that to be sent as part of RPC */
	args: Args;
	/** Flag to determine if function was called as a constructor */
	new?: boolean;
	/** An ID used to match a function call with a previous function call */
	chain?: RpcId | RpcEventId | null;
	/** Values extracted from arguments, expected to be resolved in the future */
	expect?: RpcEventId[];
};

/**
 * An RPC function result is returned from an RPC which is created from a
 * function call.
 */
export type RpcFunctionResult<Result = unknown, Error = unknown> = {
	/** The ID of the RPC from which the result originated */
	id?: RpcId;
	/** The serialized result of an RPC */
	result?: Result;
	/** Uncaught, thrown values are extracted into its own field */
	error?: Error;
	/** Values extracted from the result, expected to be resolved in the future */
	expect?: RpcEventId[];
};

const RpcEventIdSymbol: unique symbol = Symbol();
export type RpcEventId = Opaque<string, typeof RpcEventIdSymbol>;
export function createRpcEventId(id: string): RpcEventId {
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
	"id" | "expect"
> & {
	/** The event ID given from an RPC, its result, or another event contained */
	id: RpcEventId;
	/** Values extracted from the event */
	expect?: RpcEventId[];
};

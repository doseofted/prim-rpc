import { createNanoEvents, type Unsubscribe } from "nanoevents";
import type { PartialSchema } from "../rpc-interpreter";
import type {
	RpcEvent,
	RpcEventId,
	RpcFunctionCall,
	RpcFunctionResult,
} from "../types/rpc-structure";

class RpcType<
	ObjectType = unknown,
	Context extends Record<string, unknown> = Record<string, unknown>,
	EventNames extends string = string,
> {
	#emitter = createNanoEvents<RpcTypeEvents<ObjectType, EventNames>>();

	#context: Context = {} as Context;
	#eventId: RpcEventId | null = null;
	#providedObjectQueue: Array<ObjectType> = [];
	#providedRpcQueue: Array<RpcEvent<EventNames>> = [];
	#providedCallQueue: Array<RpcFunctionCall> = [];
	#providedResultQueue: Array<RpcFunctionResult> = [];

	/** Construct an object from RPC, to be provided with `.onProvided` */
	provideRpc(rpc: RpcEvent<EventNames>): void {
		if (!this.#eventId) this.#eventId = rpc.id;
		this.#reconstructAction(
			rpc,
			(provided) => this.#emitProvided(provided),
			(rpcMessage) => this.#emitRpc(rpcMessage),
			(call) => this.#emitCall(call),
			this.#context,
		);
	}

	/** Handle a chained function call on a provided object */
	provideCall(call: RpcFunctionCall): void {
		if (!this.#handleCallAction) {
			throw new Error("RPC function calls are not handled by this type");
		}
		this.#handleCallAction(
			call,
			(result) => this.#emitResult(result),
			this.#context,
		);
	}

	/** Handle a function result for a prior chained call */
	provideResult(result: RpcFunctionResult): void {
		if (!this.#handleResultAction) {
			throw new Error("RPC function results are not handled by this type");
		}
		this.#handleResultAction(result, this.#context);
	}

	#emitProvided(provided: ObjectType): void {
		const eventsCount = this.#emitter.events.provided?.length ?? 0;
		if (eventsCount === 0) {
			this.#providedObjectQueue.push(provided);
			return;
		}
		this.#emitter.emit("provided", provided);
	}

	#emitRpc(rpc: Omit<RpcEvent<EventNames>, "id" | "expect">): void {
		if (!this.#eventId) {
			throw new Error("RPC event id is not available");
		}
		const rpcObject = {
			id: this.#eventId,
			...rpc,
		};
		const eventsCount = this.#emitter.events.rpc?.length ?? 0;
		if (eventsCount === 0) {
			this.#providedRpcQueue.push(rpcObject);
			return;
		}
		this.#emitter.emit("rpc", rpcObject);
	}

	#emitCall(call: RpcFunctionCall): void {
		const eventsCount = this.#emitter.events.call?.length ?? 0;
		if (eventsCount === 0) {
			this.#providedCallQueue.push(call);
			return;
		}
		this.#emitter.emit("call", call);
	}

	#emitResult(result: RpcFunctionResult): void {
		const eventsCount = this.#emitter.events.result?.length ?? 0;
		if (eventsCount === 0) {
			this.#providedResultQueue.push(result);
			return;
		}
		this.#emitter.emit("result", result);
	}

	/** The result of RPC events received from `.provideRpc` */
	onProvided(cb?: RpcTypeEvents<ObjectType, EventNames>["provided"]): void {
		for (const providedObject of this.#providedObjectQueue) {
			cb?.(providedObject);
		}
		this.#providedObjectQueue = [];
		this.#emitter.on("provided", (given) => {
			cb?.(given);
		});
	}

	#providedObject = false;
	/** Deconstruct an object into RPC events, to be provided with `.onRpc` */
	provideObject(provided: ObjectType, id: RpcEventId): void {
		if (this.#providedObject) throw new Error("Object already provided");
		this.#providedObject = true;
		this.#eventId = id;
		this.#deconstructAction(
			provided,
			(rpc) => {
				const rpcObject = {
					id,
					...rpc,
				};
				const eventsCount = this.#emitter.events.rpc?.length ?? 0;
				if (eventsCount === 0) {
					this.#providedRpcQueue.push(rpcObject);
					return;
				}
				this.#emitter.emit("rpc", rpcObject);
			},
			this.#context,
			id,
		);
	}

	/** The RPC events emitted from `.provideObject` or `.provideRpc` */
	onRpc(cb: RpcTypeEvents<ObjectType, EventNames>["rpc"]): Unsubscribe {
		for (const rpc of this.#providedRpcQueue) {
			cb(rpc);
		}
		this.#providedRpcQueue = [];
		return this.#emitter.on("rpc", (rpc) => {
			cb(rpc);
		});
	}

	/** Function calls emitted from `.provideRpc` */
	onCall(cb: RpcTypeEvents<ObjectType, EventNames>["call"]): Unsubscribe {
		for (const call of this.#providedCallQueue) {
			cb(call);
		}
		this.#providedCallQueue = [];
		return this.#emitter.on("call", (call) => {
			cb(call);
		});
	}

	/** Function results emitted from `.provideCall` */
	onResult(cb: RpcTypeEvents<ObjectType, EventNames>["result"]): Unsubscribe {
		for (const result of this.#providedResultQueue) {
			cb(result);
		}
		this.#providedResultQueue = [];
		return this.#emitter.on("result", (result) => {
			cb(result);
		});
	}

	#reconstructAction: ReconstructCallback<ObjectType, Context, EventNames>;
	#deconstructAction: DeconstructCallback<ObjectType, Context, EventNames>;
	#handleCallAction?: HandleCallCallback<Context>;
	#handleResultAction?: HandleResultCallback<Context>;
	constructor(options: RpcTypeOptions<ObjectType, Context, EventNames>) {
		this.#reconstructAction = options.reconstruct;
		this.#deconstructAction = options.deconstruct;
		this.#handleCallAction = options.handleCall;
		this.#handleResultAction = options.handleResult;
	}
}

type RpcTypeEvents<ObjectType = unknown, EventNames extends string = string> = {
	provided: (provided: ObjectType) => void;
	rpc: (message: RpcEvent<EventNames>) => void;
	call: (message: RpcFunctionCall) => void;
	result: (message: RpcFunctionResult) => void;
};

type ReconstructCallback<
	ObjectType = unknown,
	Context = unknown,
	EventNames extends string = string,
> = (
	rpc: RpcEvent<EventNames>,
	emit: (provided: ObjectType) => void,
	emitRpc: (rpc: Omit<RpcEvent<EventNames>, "id" | "expect">) => void,
	emitCall: (call: RpcFunctionCall) => void,
	context: Context,
) => void;

type DeconstructCallback<
	ObjectType = unknown,
	Context = unknown,
	EventNames extends string = string,
> = (
	value: ObjectType,
	emit: (rpc: Omit<RpcEvent<EventNames>, "id" | "expect">) => void,
	context: Context,
	eventId: RpcEventId,
) => void;

type HandleCallCallback<Context = unknown> = (
	call: RpcFunctionCall,
	emitResult: (result: RpcFunctionResult) => void,
	context: Context,
) => void;

type HandleResultCallback<Context = unknown> = (
	result: RpcFunctionResult,
	context: Context,
) => void;

type RpcTypeOptions<
	ObjectType = unknown,
	Context = unknown,
	EventNames extends string = string,
> = {
	reconstruct: ReconstructCallback<ObjectType, Context, EventNames>;
	deconstruct: DeconstructCallback<ObjectType, Context, EventNames>;
	handleCall?: HandleCallCallback<Context>;
	handleResult?: HandleResultCallback<Context>;
	allowSchema: PartialSchema<ObjectType>;
	// isType: (value: unknown) => value is ObjectType;
	// idPrefix: string;
};

export type RpcTypeConstructor<
	ObjectType = unknown,
	Context extends Record<string, unknown> = Record<string, unknown>,
	EventNames extends string = string,
> = new () => RpcType<ObjectType, Context, EventNames>;

export function createRpcType<
	ObjectType = unknown,
	Context extends Record<string, unknown> = Record<string, unknown>,
	EventNames extends string = string,
>(
	options: RpcTypeOptions<ObjectType, Context, EventNames>,
): RpcTypeConstructor<ObjectType, Context, EventNames> {
	return class RpcTypeBuilder extends RpcType<ObjectType, Context, EventNames> {
		constructor() {
			super(options);
		}
	};
}

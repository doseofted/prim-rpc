import { createNanoEvents, type Unsubscribe } from "nanoevents";
import type { RpcEvent, RpcEventId } from "../types/rpc-structure";

class RpcType<
	ObjectType = unknown,
	Context extends Record<string, unknown> = Record<string, unknown>,
	EventNames extends string = string,
> {
	#emitter = createNanoEvents<RpcTypeEvents<ObjectType, EventNames>>();

	#context: Context = {} as Context;
	#providedObjectQueue: Array<ObjectType> = [];
	/** Construct an object from RPC, to be provided with `.onProvided` */
	provideRpc(rpc: RpcEvent<EventNames>): void {
		this.#reconstructAction(
			rpc,
			(provided) => {
				const eventsCount = this.#emitter.events.provided?.length ?? 0;
				if (eventsCount === 0) {
					this.#providedObjectQueue.push(provided);
					return;
				}
				this.#emitter.emit("provided", provided);
			},
			this.#context,
		);
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

	#id: RpcEventId;
	#providedObject = false;
	#providedRpcQueue: Array<RpcEvent<EventNames>> = [];
	/** Deconstruct an object into RPC events, to be provided with `.onRpc` */
	provideObject(provided: ObjectType, id: RpcEventId): void {
		this.#id = id;
		if (this.#providedObject) throw new Error("Object already provided");
		this.#providedObject = true;
		this.#deconstructAction(
			provided,
			(rpc) => {
				const rpcObject = {
					id: this.#id,
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
		);
	}

	/** The RPC events emitted from `.provideObject` */
	onRpc(cb: RpcTypeEvents<ObjectType, EventNames>["rpc"]): Unsubscribe {
		return this.#emitter.on("rpc", (rpc) => {
			cb(rpc);
		});
	}

	#reconstructAction: ReconstructCallback<ObjectType, Context, EventNames>;
	#deconstructAction: DeconstructCallback<ObjectType, Context, EventNames>;
	constructor(options: RpcTypeOptions<ObjectType, Context, EventNames>) {
		this.#reconstructAction = options.reconstruct;
		this.#deconstructAction = options.deconstruct;
	}
}

type RpcTypeEvents<ObjectType = unknown, EventNames extends string = string> = {
	provided: (provided: ObjectType) => void;
	rpc: (message: RpcEvent<EventNames>) => void;
};

type ReconstructCallback<
	ObjectType = unknown,
	Context = unknown,
	EventNames extends string = string,
> = (
	rpc: RpcEvent<EventNames>,
	emit: (provided: ObjectType) => void,
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
) => void;

type RpcTypeOptions<
	ObjectType = unknown,
	Context = unknown,
	EventNames extends string = string,
> = {
	reconstruct: ReconstructCallback<ObjectType, Context, EventNames>;
	deconstruct: DeconstructCallback<ObjectType, Context, EventNames>;
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

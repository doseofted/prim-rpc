import { createNanoEvents, type Unsubscribe } from "nanoevents";
import { ReconstructedPromise } from "./reconstructed/promise";
import { RpcInterpreter } from "./rpc-interpreter";
import type {
	RpcEvent,
	RpcEventId,
	RpcFunctionCall,
} from "./types/rpc-structure";

interface RpcTypeReconstruct<Events extends string = string> {
	emitReconstructEvent(rpc: RpcEvent<Events>): void;
	// reconstruct(id: RpcEventId): Promise<unknown>;
	get value(): unknown;
}

interface RpcTypeDeconstruct<Events extends string = string> {
	onDeconstructEvent(cb?: (message: RpcEvent<Events>) => void): () => void;
	deconstruct(value: unknown): void;
}

type RpcTypePromiseEvents = "resolve" | "reject";
/**
 * An RpcType should be a class that can be used either on the receiving end
 * that interprets incoming RPC events into the constructed object, or on the
 * sending end that deconstructs an object into RPC events.
 *
 * This is a type for a promise but the events should be abstracted out to
 * another class or interface from which other types can be built.
 */
export class RpcTypeReconstructPromise
	implements RpcTypeReconstruct<RpcTypePromiseEvents>
{
	#id: RpcEventId;
	#reconstructed: ReconstructedPromise<unknown> | null = null;

	// on RPC events, translate into the reconstructed object or an event on it
	emitReconstructEvent(rpc: RpcEvent<RpcTypePromiseEvents>): void {
		if (!this.#reconstructed) {
			throw new Error("Reconstruction not started yet");
		}
		if (rpc.id !== this.#id) throw new Error("Mismatched ID");
		switch (rpc.event) {
			case "resolve": {
				this.#reconstructed.admin.resolve(rpc.result);
				break;
			}
			case "reject": {
				this.#reconstructed.admin.reject(rpc.error);
				break;
			}
			default: {
				break;
			}
		}
	}

	emitReconstructCall(rpc: RpcFunctionCall): unknown {
		if (!this.#reconstructed) {
			throw new Error("Reconstruction not started yet");
		}
		// NOTE: just an example for other types, promise types won't use interpreter
		const interpreter = new RpcInterpreter(this.#reconstructed.value, {
			catch: true,
		});
		const { result } = interpreter.callMethod(rpc);
		return result;
	}

	// prepare for reconstruction (optionally return value if ready immediately)
	constructor(id: RpcEventId) {
		this.#id = id;
		const promise = new ReconstructedPromise();
		this.#reconstructed = promise;
	}

	// get the reconstructed value
	get value(): Promise<unknown> {
		if (!this.#reconstructed) throw new Error("Not constructed yet");
		return this.#reconstructed.value;
	}
}

export class RpcTypeDeconstructPromise
	implements RpcTypeDeconstruct<RpcTypePromiseEvents>
{
	#id: RpcEventId;
	constructor(id: RpcEventId) {
		this.#id = id;
	}

	#deconstructEmitter =
		createNanoEvents<DeconstructEvents<RpcTypePromiseEvents>>();

	onDeconstructEvent(
		cb: DeconstructEvents<RpcTypePromiseEvents>["rpc"],
	): Unsubscribe {
		return this.#deconstructEmitter.on("rpc", cb);
	}

	deconstruct(promise: Promise<unknown>): void {
		void promise
			.then((result) => {
				this.#deconstructEmitter.emit("rpc", {
					id: this.#id,
					event: "resolve",
					result,
				});
			})
			.catch((error) => {
				this.#deconstructEmitter.emit("rpc", {
					id: this.#id,
					event: "reject",
					error,
				});
			});
	}
}

type DeconstructEvents<Events extends string> = {
	rpc: (message: RpcEvent<Events>) => void;
};

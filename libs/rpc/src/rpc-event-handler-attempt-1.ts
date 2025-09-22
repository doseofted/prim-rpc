import { createNanoEvents, type Unsubscribe } from "nanoevents";
import { EventExtractor, type ReplacedReferences } from "./event-extractor";
import {
	createRpcEventId,
	type RpcEvent,
	type RpcEventId,
} from "./types/rpc-structure";

/**
 * For a given RPC event identifier, listen for events on that object and emit
 * RPC. New events found in the event will also be emitted.
 */
export class RpcEventHandler {
	#emitter = createNanoEvents<RpcEventList>();

	#eventId: RpcEventId;
	#eventExtractor: EventExtractor;
	constructor(eventId: string, eventExtractor?: EventExtractor) {
		this.#eventId = createRpcEventId(eventId);
		this.#eventExtractor = eventExtractor ?? new EventExtractor(true, true);
	}

	/** When an event is emitted, a corresponding RPC message will be emitted */
	onEmittedRpc(cb?: RpcEventList["rpc"]): Unsubscribe {
		return this.#emitter.on("rpc", cb);
	}

	onNewReferences(cb?: RpcEventList["extracted"]): Unsubscribe {
		return this.#emitter.on("extracted", cb);
	}

	/**
	 * For each event on an object or resolved value, call this function with the
	 * intended values. For example, a resolved promise would have an event of
	 * "resolved" and the resolved value(s) as arguments. The return value is
	 * an RPC event that can be sent.
	 *
	 * Some received object types may emit multiple values. The given event name
	 * should communicate to the other side what to do with the received values.
	 */
	emitValue(event: string, value: unknown): RpcEvent {
		const [result, extracted] = this.#eventExtractor.extract(value);
		const emit = {
			id: createRpcEventId(this.#eventId),
			event,
			result,
			expect: Array.from(extracted.keys()).map(createRpcEventId),
		};
		this.#emitter.emit("rpc", emit);
		if (extracted.size) this.#emitter.emit("extracted", extracted);
		return emit;
	}

	/**
	 * If an error is thrown from an object and not caught, call this function
	 * with the given error. For example, a promise that rejects would emit an
	 * event of "rejected" and the rejection reason as an argument. The return
	 * value is an RPC event that can be sent.
	 *
	 * It is unlikely that an object will emit multiple errors, so while it's
	 * possible to emit multiple error values, it should be avoided if possible.
	 */
	emitError(event: string, value: unknown): RpcEvent {
		const [error, extracted] = this.#eventExtractor.extract(value);
		const emit = {
			id: createRpcEventId(this.#eventId),
			event,
			error,
			expect: Array.from(extracted.keys()).map(createRpcEventId),
		};
		this.#emitter.emit("rpc", emit);
		if (extracted.size) this.#emitter.emit("extracted", extracted);
		return emit;
	}
}

type RpcEventList = {
	rpc: (message: RpcEvent<string>) => void;
	extracted: (extracted: ReplacedReferences) => void;
};

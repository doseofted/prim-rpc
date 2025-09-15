// import { EventExtractor } from "../event-extractor";
// import { createRpcEventId, type RpcEvent } from "./types-message";

/**
 * An RPC's arguments or returned value may contain events that happen over
 * time or other types that may be difficult to serialize.  THese values may
 * also be contained inside of another event.
 *
 * The purpose of this class is to encode these values and new values returned
 * from other events into RPC event messages that can be iterated on.
 */
export class RpcEventEncoder {
	// #extractor = new EventExtractor();
	// encode(value: unknown): RpcEvent {
	// 	const [result, extracted] = this.#extractor.extract(value);
	// }
}

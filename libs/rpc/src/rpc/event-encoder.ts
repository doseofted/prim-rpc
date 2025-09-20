import { EventExtractor, type ReplacedReferences } from "../event-extractor";
import {
	createRpcEventId,
	type RpcEvent,
	type RpcFunctionCall,
	type RpcFunctionResult,
} from "../types/rpc-structure";

/**
 * An RPC's arguments or returned value may contain events that happen over
 * time or other types that may be difficult to serialize.  THese values may
 * also be contained inside of another event.
 *
 * The purpose of this class is to encode these values and new values returned
 * from other events into RPC event messages that can be iterated on.
 */
export class RpcEventEncoder extends EventExtractor {
	extract<T extends RpcFunctionCall | RpcEvent | RpcFunctionResult>(
		given: T,
	): [provided: T, extracted: ReplacedReferences] {
		if ("args" in given) {
			const [argsReplaced, extracted] = super.extract(given.args);
			const expect = Array.from(extracted.keys()).map(createRpcEventId);
			given.expect = expect;
			given.args = argsReplaced;
			return [given, extracted];
		}
		if ("result" in given) {
			const [resultReplaced, extracted] = super.extract(given.result);
			const expect = Array.from(extracted.keys()).map(createRpcEventId);
			given.expect = expect;
			given.result = resultReplaced;
			return [given, extracted];
		}
		if ("error" in given) {
			const [errorReplaced, extracted] = super.extract(given.error);
			const expect = Array.from(extracted.keys()).map(createRpcEventId);
			given.expect = expect;
			given.error = errorReplaced;
			return [given, extracted];
		}
		return [given, new Map()];
	}

	merge<T extends RpcFunctionCall | RpcEvent | RpcFunctionResult>(
		given: T,
		extracted: ReplacedReferences,
	): T {
		if ("args" in given) {
			given.args = super.merge(given.args, extracted);
			delete given.expect;
			return given;
		}
		if ("result" in given) {
			given.result = super.merge(given.result, extracted);
			delete given.expect;
			return given;
		}
		if ("error" in given) {
			given.error = super.merge(given.error, extracted);
			delete given.expect;
			return given;
		}
		return given;
	}

	// encode(value: unknown): RpcEvent {
	// 	const [result, extracted] = this.#extractor.extract(value);
	// 	const expect = Array.from(extracted.keys()).map(createRpcEventId);
	// }

	// constructor() {
	// 	this.#extractor = new EventExtractor();
	// 	this.#extractor.addSupportedType(EventfulPromise);
	// }
}

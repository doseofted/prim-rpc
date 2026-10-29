import { castToOpaque, type Opaque } from "emery";

/**
 * Helper utility to generate incrementing identifiers, only if a provided
 * condition is matched.
 */
export class IdGenerator {
	#id = 0;
	#prefix: string;
	#createNextId: () => EventId;

	constructor(prefix: string, matcher: (provided: unknown) => boolean) {
		this.#prefix = prefix;
		this.#createNextId = () => createEventId(prefix)(++this.#id);
		this.#matcher = matcher;
	}

	/** The literal prefix string this generator stamps on every id. */
	get prefix(): string {
		return this.#prefix;
	}

	#matcher: (provided: unknown) => boolean;
	isMatch(provided: unknown): EventId | false {
		return this.#matcher(provided) ? this.#createNextId() : false;
	}
}

const EventIdSymbol: unique symbol = Symbol();
export type EventId = Opaque<string, typeof EventIdSymbol>;
export function createEventId(prefix: string): (id: number) => EventId {
	return (id: number) => castToEventId([prefix, id].join(""));
}
export function castToEventId(id: string): EventId {
	if (!id.match(/^[a-zA-Z0-9]+[0-9]+$/)) {
		throw new TypeError(`Invalid EventId: ${id}`);
	}
	return castToOpaque<EventId>(id);
}

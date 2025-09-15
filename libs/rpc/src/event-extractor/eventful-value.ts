import { castToOpaque, type Opaque } from "emery";

const EventfulValueSymbol: unique symbol = Symbol();
export type EventfulValueId = Opaque<string, typeof EventfulValueSymbol>;
export function createEventfulValueId(
	prefix: string,
): (id: number) => EventfulValueId {
	return (id: number) => castToOpaque<EventfulValueId>([prefix, id].join(""));
}

/**
 * Base class used to add a supported type to `EventExtract`. Extend this class
 * and provide required options to detect whether a type is supported and
 * generate unique IDs for that instant.
 */
export class EventfulValue {
	#id = 0;
	#createNextId: () => EventfulValueId;

	constructor(prefix: string, matcher: (provided: unknown) => boolean) {
		this.#createNextId = () => createEventfulValueId(prefix)(++this.#id);
		this.#matcher = matcher;
	}

	#matcher: (provided: unknown) => boolean;
	isMatch(provided: unknown): EventfulValueId | false {
		return this.#matcher(provided) ? this.#createNextId() : false;
	}
}
export type InheritsEventfulValue = Omit<typeof EventfulValue, "new"> & {
	new (): EventfulValue;
};

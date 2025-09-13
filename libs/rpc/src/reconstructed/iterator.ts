import { createNanoEvents } from "nanoevents";
import { ReconstructedPromise } from "./promise";

/**
 * When it's known that an iterator is returned but the iterator is not yet
 * available, this async iterator `.value` can be returned and iterated over
 * while iteration is controlled later with `.admin` actions.
 *
 * Since the iterator results are not know at the time of iteration, the
 * iterator created will be asynchronous even if methods that handle iteration
 * do not include promised results.
 */
export class ReconstructedIterator {
	#emitter = createNanoEvents<AsyncIteratorEvents>();

	get #listenersCount(): Record<keyof AsyncIteratorEvents, number> {
		const entries = Object.entries(this.#emitter.events);
		const modified = entries.map(([key, value]) => [key, value?.length ?? 0]);
		return Object.fromEntries(modified);
	}

	#nextQueue: QueueItem[] = [];
	#returnQueue: QueueItem[] = [];
	#throwQueue: QueueItem[] = [];

	get #queue() {
		return {
			next: this.#nextQueue,
			return: this.#returnQueue,
			throw: this.#throwQueue,
		};
	}

	#onEvent(
		event: AsyncIteratorEventsKey,
		callback: AsyncIteratorEvents[AsyncIteratorEventsKey],
	) {
		if (this.#listenersCount[event] > 0) {
			throw new Error(`Listener for '${event}' already registered`);
		}
		const unsubscribe = this.#emitter.on(event, async () => {
			const itemInQueue = this.#nextQueue.shift();
			if (!itemInQueue)
				throw new Error(`No '${event}' calls in queue to handle`);
			const [promise, providedArgs] = itemInQueue;
			try {
				const result = await callback(...providedArgs);
				promise.admin.resolve(result);
				return result;
			} catch (error) {
				promise.admin.reject(error);
				return error;
			}
		});
		const queue = this.#queue[event];
		if (!queue) throw new Error(`No queue found for event '${event}'`);
		for (const [_promise, args] of queue.concat()) {
			this.#emitter.emit(event, ...args);
		}
		return unsubscribe;
	}

	#onNext(callback: AsyncIteratorEvents["next"]) {
		return this.#onEvent("next", callback);
	}

	#onReturn(callback: AsyncIteratorEvents["return"]) {
		return this.#onEvent("return", callback);
	}

	#onThrow(callback: AsyncIteratorEvents["throw"]) {
		return this.#onEvent("throw", callback);
	}

	get admin(): {
		onNext: (cb: AsyncIteratorEvents["next"]) => () => void;
		onReturn: (cb: AsyncIteratorEvents["return"]) => () => void;
		onThrow: (cb: AsyncIteratorEvents["throw"]) => () => void;
	} {
		const onNext = (cb: AsyncIteratorEvents["next"]) => this.#onNext(cb);
		const onReturn = (cb: AsyncIteratorEvents["return"]) => this.#onReturn(cb);
		const onThrow = (cb: AsyncIteratorEvents["throw"]) => this.#onThrow(cb);
		return {
			onNext,
			onReturn,
			onThrow,
		};
	}

	#valueMethod(event: AsyncIteratorEventsKey, ...args: unknown[]) {
		const promise = new ReconstructedPromise<IteratorResult<unknown>>();
		this.#queue[event].push([promise, args]);
		this.#emitter.emit(event, ...args);
		return promise.value;
	}

	#value = {
		[Symbol.asyncIterator]() {
			return this;
		},
		next: async (...args: unknown[]) => {
			return this.#valueMethod("next", ...args);
		},
		return: async (...args: unknown[]) => {
			return this.#valueMethod("return", ...args);
		},
		throw: async (...args: unknown[]) => {
			return this.#valueMethod("throw", ...args);
		},
	} satisfies AsyncIterableIterator<unknown>;
	get value(): AsyncIterableIterator<unknown> {
		return this.#value;
	}
}

type AsyncIteratorEvents = {
	next: (
		...args: unknown[]
	) => IteratorResult<unknown> | Promise<IteratorResult<unknown>>;
	return: (
		...args: unknown[]
	) => IteratorResult<unknown> | Promise<IteratorResult<unknown>>;
	throw: (
		error?: unknown,
	) => IteratorResult<unknown> | Promise<IteratorResult<unknown>>;
};

type AsyncIteratorEventsKey = keyof AsyncIteratorEvents;

type QueueItem = [
	promise: ReconstructedPromise<IteratorResult<unknown>>,
	args: unknown[],
];

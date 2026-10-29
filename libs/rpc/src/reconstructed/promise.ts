/**
 * When it's known that a promise is returned but the value is unknown, this
 * promise `.value` can be returned and resolved/rejected later with `.admin`
 * actions.
 *
 * This is essentially just `Promise.withResolvers()` (but it's still relatively
 * new in 2025)
 */
export class ReconstructedPromise<T> {
	#resolve?: (value: T | PromiseLike<T>) => void;
	// biome-ignore lint/suspicious/noExplicitAny: not typically typed
	#reject?: (reason?: any) => void;

	#value = new Promise<T>((resolve, reject) => {
		this.#resolve = resolve;
		this.#reject = reject;
	});

	get admin(): {
		resolve: (value: T | PromiseLike<T>) => void;
		// biome-ignore lint/suspicious/noExplicitAny: not typically typed
		reject: (reason?: any) => void;
	} {
		const resolve = this.#resolve;
		const reject = this.#reject;
		if (!resolve || !reject) {
			throw new Error("ReconstructedPromise resolvers are not initialized");
		}
		return { resolve, reject };
	}

	get value(): Promise<T> {
		return this.#value;
	}
}

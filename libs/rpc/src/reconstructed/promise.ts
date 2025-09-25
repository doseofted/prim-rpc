/**
 * When it's known that a promise is returned but the value is unknown, this
 * promise `.value` can be returned and resolved/rejected later with `.admin`
 * actions.
 *
 * This is essentially just `Promise.withResolvers()` (but it's still relatively
 * new in 2025)
 */
export class ReconstructedPromise<T> {
	admin: {
		resolve: (value: T | PromiseLike<T>) => void;
		// biome-ignore lint/suspicious/noExplicitAny: not typically typed
		reject: (reason?: any) => void;
	};

	#value = new Promise<T>((resolve, reject) => {
		this.admin = { reject, resolve };
	});
	get value(): Promise<T> {
		return this.#value;
	}
}

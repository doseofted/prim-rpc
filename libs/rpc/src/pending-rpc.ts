import { castToOpaque, isNullish, type Opaque } from "emery";
import { createNanoEvents, type Unsubscribe } from "nanoevents";
import { ReconstructedPromise } from "./reconstructed/promise";
import type { RpcFunctionCall, RpcId } from "./types/rpc-structure";

/**
 * RPC may either be sent immediately or collected in a queue depending on how
 * calls are configured to be sent (likely due to transport limitations).
 *
 * This is a queue that can either be configured to dispatch immediately, on a
 * timer, on a given keyword, or manually with a method (to be provided as a
 * callback to some external event).
 */
export class PendingRpc {
	#options: HandleOnOptions;

	constructor(
		options: HandleOnOptions = { event: HandleEvent.Call },
		handler: null | QueueHandler = null,
	) {
		if (
			options.event === HandleEvent.Keyword &&
			options.keywords.length === 0
		) {
			throw new Error("Keywords must be provided to handle events on Keyword");
		}
		this.#options = options;
		this.#options.timeoutAppliesOn ??= "chain";
		this.#options.timeoutEdge ??= "trailing";
		this.#options.timeoutStyle ??= "debounce";
		if (handler) {
			this.#emitter.on("pending", (newRpc, skipPlaceholder, allRpc) => {
				const results = handler(newRpc, skipPlaceholder, allRpc);
				this.#pendingEventHandler(newRpc, results, skipPlaceholder);
				return results;
			});
		}
	}

	#orderIncrementor = 0;

	/**
	 * Keep track of all provided chains of RPC so that once an event occurs,
	 * as configured in the options, all RPC contained in the chain can be sent
	 * off to the configured handler as new RPC.
	 */
	#queuedChains = new Map<
		RpcChainId,
		{
			rpc: RpcFunctionCall[];
			controller: AbortController | null;
			order: number;
			globalReady: boolean;
		}
	>();

	/** The results of individual RPC calls */
	#results: Map<
		RpcId,
		{
			/** Whether the RPC ID has been passed to the provided handler yet */
			handled: boolean;
			/** The intended result of the RPC ID (to be resolved/rejected later) */
			promised: null | ReconstructedPromise<unknown>;
			/** The symbol used to skip this RPC (if provided) */
			skip: symbol | null;
		}
	> = new Map();

	/**
	 * Add a given RPC chain to the queue. The RPC chain will eventually be handed
	 * off to the handler when the condition event occurs. That handler is
	 * expected to return values for each new RPC in the chain.
	 *
	 * The result of this function is a promise to the result of the last RPC in
	 * the provided chain.
	 */
	async queueRpc(
		rpc: RpcFunctionCall[],
		skip: symbol | null = null,
	): Promise<unknown> {
		// find or create metadata template for each RPC ID
		const rpcMeta = rpc
			.map((rpc) => {
				const id = rpc.id;
				if (!id) return null;
				let metadata = this.#results.get(id) ?? null;
				if (metadata) return { id, metadata };
				const handled = false;
				const promised = new ReconstructedPromise<unknown>();
				metadata = { handled, promised, skip };
				this.#results.set(id, metadata);
				return { id, metadata, rpc };
			})
			.filter((rpc) => rpc !== null);
		// find any previous chains and cancel them (but track in appended chain)
		const rpcIds = rpcMeta.map(({ id }) => id);
		const oldChainId = createRpcChainId(rpcIds.slice(0, -1));
		const previousChain = this.#queuedChains.get(oldChainId) ?? null;
		const isBatched = !isNullish(this.#options.timeoutBatch);
		const isThrottle = this.#options.timeoutStyle === "throttle";
		const globalAbort = isBatched && this.#options.timeoutAppliesOn === "call";
		let createdGlobalTimer = false;
		if (previousChain) {
			if (isThrottle) {
				// Throttle: keep the existing timer and redirect to the new chain
				this.#chainRedirects.set(oldChainId, createRpcChainId(rpcIds));
			} else {
				// Debounce: cancel the previous timer
				previousChain.controller?.abort();
			}
			this.#queuedChains.delete(oldChainId);
		}

		const newChainId = createRpcChainId(rpcIds);
		// Transfer leading-timeout cooldown when a chain grows to a new ID
		if (previousChain && this.#leadingCooldown.has(oldChainId)) {
			this.#leadingCooldown.delete(oldChainId);
			this.#leadingCooldown.add(newChainId);
		}
		if (globalAbort) {
			if (isThrottle) {
				// Throttle: only start a new global timer if none is active
				if (
					!this.#globalAbortController ||
					this.#globalAbortController.signal.aborted
				) {
					this.#globalAbortController = new AbortController();
					createdGlobalTimer = true;
				}
			} else {
				// Debounce: reset the global batch timeout on every call
				this.#globalAbortController?.abort();
				this.#globalAbortController = new AbortController();
				createdGlobalTimer = true;
			}
			for (const meta of this.#queuedChains.values()) {
				// this call shouldn't be made until the last global call is made
				// (and the last call will not have a `.globalReady` flag set)
				meta.globalReady = true;
			}
		}
		const order = this.#orderIncrementor++;
		const globalReady = false;
		const controller = isBatched
			? (this.#globalAbortController ?? new AbortController())
			: null;
		this.#queuedChains.set(newChainId, { rpc, controller, order, globalReady });

		const hasExistingChainTimer = previousChain !== null && isThrottle;
		const shouldScheduleTimer =
			(!globalAbort || !isThrottle || createdGlobalTimer) &&
			!hasExistingChainTimer;

		const isCall = this.#options.event === HandleEvent.Call;
		if (isCall && shouldScheduleTimer) {
			this.#batchTriggerEvent(newChainId, controller);
		}
		const isKeyword =
			this.#options.event === HandleEvent.Keyword ? this.#options : false;
		const lastRpc = rpcMeta.at(-1);
		if (!lastRpc) throw new Error("No RPC provided to queue");
		if (isKeyword) {
			const method = lastRpc.rpc?.method;
			const methodLast = Array.isArray(method) ? method.at(-1) : method;
			const { keywords } = isKeyword;
			const isKeywordMethod = methodLast && keywords.includes(methodLast);
			if (isKeywordMethod && shouldScheduleTimer) {
				this.#batchTriggerEvent(newChainId, controller);
			}
		}
		const promised = lastRpc.metadata.promised;
		return promised?.value;
	}

	/**
	 * Manually call a specific chain that was added to the queue. The class
	 * instance must be configured with the `External` event type to call this
	 * method.
	 */
	externalCall(rpcChainIds: RpcId[]): void {
		const isExternal = this.#options.event === HandleEvent.External;
		if (!isExternal) {
			throw new Error(
				"Cannot call RPC chains directly unless configured with External event",
			);
		}
		const chainId = createRpcChainId(rpcChainIds);
		const controller = this.#queuedChains.get(chainId)?.controller ?? null;
		this.#batchTriggerEvent(chainId, controller);
	}

	#globalAbortController: AbortController | null = null;

	/** Redirect stale chain IDs to their current successor during throttle windows */
	#chainRedirects = new Map<RpcChainId, RpcChainId>();

	#resolveChainId(chainId: RpcChainId): RpcChainId {
		let current = chainId;
		while (this.#chainRedirects.has(current)) {
			const next = this.#chainRedirects.get(current);
			if (!next) break;
			this.#chainRedirects.delete(current);
			current = next;
		}
		return current;
	}

	/** Tracks chains currently in a leading-timeout cooldown window */
	#leadingCooldown = new Set<RpcChainId>();
	/** Tracks whether the global scope is in a leading-timeout cooldown */
	#globalLeadingCooldown = false;

	/**
	 * Trigger an event immediately if configured to do so. Otherwise queue
	 * the event using the provided batch options.
	 */
	#batchTriggerEvent(
		chainId: RpcChainId,
		controller: AbortController | null,
	): void {
		if (!controller) {
			this.#triggerEvent(chainId);
			return;
		}
		const timeout = this.#options.timeoutBatch ?? 0;
		const edge = this.#options.timeoutEdge ?? "trailing";
		const hasLeading = edge === "leading" || edge === "both";
		const hasTrailing = edge === "trailing" || edge === "both";
		const isGlobal = this.#options.timeoutAppliesOn === "call";

		// Leading edge: fire immediately if not already in a cooldown window
		if (hasLeading) {
			const inCooldown = isGlobal
				? this.#globalLeadingCooldown
				: this.#leadingCooldown.has(chainId);
			if (!inCooldown) {
				// Enter cooldown and fire immediately
				if (isGlobal) {
					this.#globalLeadingCooldown = true;
				} else {
					this.#leadingCooldown.add(chainId);
				}
				this.#triggerEvent(chainId);
			}
		}

		// Trailing edge: flush anything accumulated during the cooldown window
		setTimeout(() => {
			if (controller.signal.aborted) return;
			const resolvedId = this.#resolveChainId(chainId);
			const chain = this.#queuedChains.get(resolvedId) ?? null;
			const isThrottleGlobal =
				this.#options.timeoutStyle === "throttle" && isGlobal;
			if (chain?.globalReady && !isThrottleGlobal) {
				return; // already triggered as part of global batch
			}
			// Clear cooldown state so the next call after this fires immediately again
			if (hasLeading) {
				if (isGlobal) {
					this.#globalLeadingCooldown = false;
				} else {
					this.#leadingCooldown.delete(resolvedId);
				}
			}
			if (hasTrailing) {
				const isBatched = !isNullish(this.#options.timeoutBatch);
				const globalAbort =
					isBatched && this.#options.timeoutAppliesOn === "call";
				if (isThrottleGlobal) {
					// Throttle: flush every queued chain when the fixed window closes
					for (const [chainIdEntry] of this.#queuedChains.entries()) {
						this.#triggerEvent(chainIdEntry);
					}
				} else {
					this.#triggerEvent(resolvedId);
					if (!globalAbort) return;
					// Debounce: flush chains waiting on the global batch trigger
					for (const [chainIdEntry, meta] of this.#queuedChains.entries()) {
						if (meta.globalReady) this.#triggerEvent(chainIdEntry);
					}
				}
			}
		}, timeout);
	}

	#handledNotEmittedQueue: Parameters<QueueHandler>[] = [];
	#emitter = createNanoEvents<PendingRpcEvents>();

	#triggerEvent(chainId: RpcChainId) {
		const chain = this.#queuedChains.get(chainId) ?? null;
		const rpcChainOnly = chain?.rpc ?? [];
		if (rpcChainOnly.length === 0) return; // this shouldn't happen

		const rpcChain = rpcChainOnly
			.map((rpc) => {
				const id = rpc.id;
				if (!id) return null;
				const metadata = this.#results.get(id);
				const handled = metadata ? metadata.handled : false;
				return { rpc, metadata, handled };
			})
			.filter((item) => item !== null);
		const unhandled = rpcChain
			.filter((item) => !item.handled)
			.map((item) => item.rpc);
		if (unhandled.length === 0) return;
		const skipPlaceholder = Symbol();
		if (this.#handlerConfigured) {
			this.#emitter.emit("pending", unhandled, skipPlaceholder, rpcChainOnly);
		} else {
			this.#handledNotEmittedQueue.push([
				unhandled,
				skipPlaceholder,
				rpcChainOnly,
			]);
		}
	}

	get #handlerConfigured(): boolean {
		const existingHandlers = this.#emitter.events.pending?.length ?? 0;
		return existingHandlers > 0;
	}

	async #pendingEventHandler(
		newRpc: RpcFunctionCall[],
		results: unknown[],
		skipPlaceholder: symbol,
	) {
		if (newRpc.length !== results.length) {
			throw new Error("Pending RPC handler returned mismatched results length");
		}
		const promised = newRpc.map(async (rpc, index) => {
			if (!rpc.id) return;
			const metadata = this.#results.get(rpc.id);
			if (!metadata) return;
			if (metadata.handled) return; // this should only be new RPC
			metadata.handled = true;
			const resultPromise = results.at(index);
			try {
				const result = await resultPromise;
				if (result === skipPlaceholder) {
					metadata.promised?.admin.resolve(metadata.skip);
				} else {
					metadata.promised?.admin.resolve(result);
				}
			} catch (error) {
				metadata.promised?.admin.reject(error);
			} finally {
				metadata.promised = null; // clear reference
			}
		});
		await Promise.all(promised);
	}

	onQueuedRpc(handler: QueueHandler): Unsubscribe {
		if (this.#handlerConfigured)
			throw new Error("Pending RPC handler already set");
		const removeHandler = this.#emitter.on(
			"pending",
			(newRpc, skipPlaceholder, allRpc) => {
				const results = handler(newRpc, skipPlaceholder, allRpc);
				this.#pendingEventHandler(newRpc, results, skipPlaceholder);
				return results;
			},
		);
		if (this.#handledNotEmittedQueue.length > 0) {
			for (const queued of this.#handledNotEmittedQueue) {
				this.#emitter.emit("pending", ...queued);
			}
			this.#handledNotEmittedQueue = [];
		}
		return removeHandler;
	}
}

type PendingRpcEvents = {
	pending: QueueHandler;
};

export enum HandleEvent {
	/** Immediately process all provided RPC once called */
	Call = 1,
	/** Process RPC once a specific method is called */
	Keyword,
	/**
	 * Process all pending RPC for a chain once an external event occurs
	 * (triggered manually)
	 */
	External,
}

export type QueueHandler = (
	/** Unhandled, new RPC which may reference RPC from previous chains */
	newRpc: RpcFunctionCall[],
	skipSymbol: symbol,
	/** All RPC that makes up the given chain, including handled calls, for context */
	allRpc: RpcFunctionCall[],
) => unknown[];

type BatchOptions = {
	/**
	 * Process RPC after a certain amount of time has passed since the last call
	 * in a chain (batching). This applies to the whole chain, not individual
	 * method calls in the chain.
	 *
	 * There are other timeout options that are configured with decent defaults
	 * depending on the option chosen. These default can be provided explicitly
	 * if defaults don't match needs of a project.
	 */
	timeoutBatch: number | null;
	/**
	 * The timeout, if enabled, applies by default to individual chains of RPC,
	 * not individual calls across chains. This option can be changed.
	 *
	 * When set to `"chain"` (and using the Call event as an example), a call on
	 * `client` such as `client.a().b()` will start a new timer.
	 * If `client.c().d()` is called prior to the timer event, it has no effect
	 * because it's not part of the same chain.
	 *
	 * When set to `"call"`, each individual method call starts/resets the timer.
	 * In this case, calling `client.a().b()` followed by `client.c().d()` prior
	 * to the timer expiring will result in all four calls being batched together
	 * once the timer expires.
	 */
	timeoutAppliesOn: "chain" | "call";
	/**
	 * The edge at which the timeout happens during a window.
	 *
	 * - `"trailing"`: dispatch at the end of a window (default)
	 * - `"leading"`: dispatch the first call immediately and clear the cooldown
	 * at the end of the window, without dispatching event at the end of the
	 * window (typically not used for RPC, see "both" option)
	 * - `"both"`: dispatch immediately on the first call and then dispatch
	 * remaining calls at the end of the window
	 */
	timeoutEdge: "leading" | "trailing" | "both";
	/**
	 * The method by which the timeout window is managed.
	 *
	 * - `"throttle"`: fires events at a steady interval (default), ensures
	 * continuous RPC events doesn't prevent future RPC from firing
	 * - `"debounce"`: fires events at the end of an interval, ensures that RPC
	 * events are only fired after stream of events has settled
	 *
	 * Note that using the "debounce" option with a "leading" edge may result in
	 * events that don't fire until the next window.
	 */
	timeoutStyle: "debounce" | "throttle";
};

type HandleOnOptionsBase =
	| {
			/**
			 * Immediately process all provided RPC once called. This may be
			 * combined with the timer options to batch RPC calls as soon as they
			 * happen and the batch timeout elapses.
			 */
			event: HandleEvent.Call;
	  }
	| {
			/**
			 * Process all pending RPC for a chain once an external event occurs
			 * (triggered manually). This may be used if a timer is set up outside
			 * of this class or if RPC is only executed based on a specific user
			 * interaction (like a button tap).
			 */
			event: HandleEvent.External;
	  }
	| {
			/**
			 * Process RPC once a specific method is called. This may be used to
			 * only process RPC once a keyword like `.end()` or `.exec()` is called.
			 * It may also be used to detect a promise method if promise methods are
			 * processed as RPC events. If promises are handled separate from RPC,
			 * consider opting for the `External` event instead and trigger when a
			 * promise method is called.
			 */
			event: HandleEvent.Keyword;
			/** Keywords to trigger the handler */
			keywords: PropertyKey[];
	  };
export type HandleOnOptions = HandleOnOptionsBase & Partial<BatchOptions>;
const RpcIdSymbol: unique symbol = Symbol();
export type RpcChainId = Opaque<string, typeof RpcIdSymbol>;
export function createRpcChainId(rpcIds: RpcId[]): RpcChainId {
	return castToRpcChainId(rpcIds.join("/"));
}
export function castToRpcChainId(rpcIdChain: string): RpcChainId {
	return castToOpaque<RpcChainId>(rpcIdChain);
}

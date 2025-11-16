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
		if (handler) {
			this.#emitter.on("pending", (newRpc, allRpc) => {
				const results = handler(newRpc, allRpc);
				this.#pendingEventHandler(newRpc, results);
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
	async queueRpc(rpc: RpcFunctionCall[]): Promise<unknown> {
		// find or create metadata template for each RPC ID
		const rpcMeta = rpc
			.map((rpc) => {
				const id = rpc.id;
				if (!id) return null;
				let metadata = this.#results.get(id) ?? null;
				if (metadata) return { id, metadata };
				const handled = false;
				const promised = new ReconstructedPromise<unknown>();
				metadata = { handled, promised };
				this.#results.set(id, metadata);
				return { id, metadata, rpc };
			})
			.filter((rpc) => rpc !== null);
		// find any previous chains and cancel them (but track in appended chain)
		const rpcIds = rpcMeta.map(({ id }) => id);
		const oldChainId = createRpcChainId(rpcIds.slice(0, -1));
		const previousChain = this.#queuedChains.get(oldChainId) ?? null;
		if (previousChain) {
			previousChain.controller?.abort();
			this.#queuedChains.delete(oldChainId);
		}

		const newChainId = createRpcChainId(rpcIds);
		const isBatched = !isNullish(this.#options.timeoutBatch);
		const globalAbort = isBatched && this.#options.timeoutAppliesOn === "call";
		if (globalAbort) {
			// Abort the previous global timer and create a new one to reset the batch timeout
			this.#globalAbortController?.abort();
			this.#globalAbortController = new AbortController();
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

		const isCall = this.#options.event === HandleEvent.Call;
		if (isCall) {
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
			if (isKeywordMethod) this.#batchTriggerEvent(newChainId, controller);
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
		setTimeout(() => {
			if (controller.signal.aborted) return;
			const chain = this.#queuedChains.get(chainId) ?? null;
			if (chain?.globalReady) return; // already triggered as part of global batch
			this.#triggerEvent(chainId);
			const isBatched = !isNullish(this.#options.timeoutBatch);
			const globalAbort =
				isBatched && this.#options.timeoutAppliesOn === "call";
			if (!globalAbort) return;
			// only trigger events that are waiting on global batch trigger
			for (const [chainIdEntry, meta] of this.#queuedChains.entries()) {
				if (meta.globalReady) this.#triggerEvent(chainIdEntry);
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
		if (this.#handlerConfigured) {
			this.#emitter.emit("pending", unhandled, rpcChainOnly);
		} else {
			this.#handledNotEmittedQueue.push([unhandled, rpcChainOnly]);
		}
	}

	get #handlerConfigured(): boolean {
		const existingHandlers = this.#emitter.events.pending?.length ?? 0;
		return existingHandlers > 0;
	}

	async #pendingEventHandler(
		newRpc: RpcFunctionCall[],
		results: Promise<unknown>[],
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
				metadata.promised?.admin.resolve(await resultPromise);
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
		const removeHandler = this.#emitter.on("pending", (newRpc, allRpc) => {
			const results = handler(newRpc, allRpc);
			this.#pendingEventHandler(newRpc, results);
			return results;
		});
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
	/** All RPC that makes up the given chain, including handled calls, for context */
	allRpc: RpcFunctionCall[],
) => Promise<unknown>[];

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
	 * Whether the timeout is leading (at start) or trailing (at end). It is
	 * recommended to use trailing timeouts (`false`) for Call events.
	 */
	// TODO: implement leading timeouts
	// timeoutLeading: boolean | null;
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

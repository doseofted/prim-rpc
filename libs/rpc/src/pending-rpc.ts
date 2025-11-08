import { castToOpaque, type Opaque } from "emery";
import { createNanoEvents, type Unsubscribe } from "nanoevents";
import { ReconstructedPromise } from "./reconstructed/promise";
import type { RpcFunctionCall, RpcId } from "./types/rpc-structure";

/**
 * RPC may either be sent immediately or collected in a queue depending on how
 * calls are configured to be sent (likely due to transport limitations).
 *
 * This is a queue that can either be configured to dispatch immediately, on a
 * timer, or manually with a method (to be provided an an event's callback).
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
		if (options.event === HandleEvent.Batch && options.timeout <= 0) {
			throw new Error("Timeout must be provided to handle events on Debounce");
		}
		this.#options = options;
		if (handler) {
			this.#emitter.on("pending", (newRpc, allRpc) => {
				const results = handler(newRpc, allRpc);
				this.#pendingEventHandler(newRpc, results);
				return results;
			});
		}
	}

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
		}
	>();

	/**
	 * Each time RPC is received, it's possible that a chain has been appended
	 * and events on a previous chain should no longer be called. However if we
	 * already have set up a debounce timer that will get called, we need to
	 * ensure that old chains are not processed, only the newer, updated chain.
	 *
	 * Each time a chain is updated, add the old chain ID to this set so that an
	 * event is not handled prematurely.
	 */
	// NOTE: if already removed from queued chains, do we still need to track cancelled events?
	// #cancelledChains = new Set<RpcChainId>();

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
		const isDebounced =
			this.#options.event === HandleEvent.Batch ? this.#options : false;
		const controller = isDebounced ? new AbortController() : null;
		this.#queuedChains.set(newChainId, { rpc, controller });
		const isCall = this.#options.event === HandleEvent.Call;
		if (isCall) {
			this.#triggerEvent(newChainId);
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
			if (isKeywordMethod) this.#triggerEvent(newChainId);
		}
		if (isDebounced) {
			const signal = controller?.signal;
			const debounceTimeout = isDebounced ? isDebounced.timeout : 0;
			setTimeout(() => {
				if (signal?.aborted ?? true) return;
				this.#triggerEvent(newChainId);
			}, debounceTimeout);
		}
		// we will either add to an existing chain (new RPC ID added to the end)
		// - look for slice [0, -1] of chain
		// or will create a new chain (first RPC ID added or part of chain ended)
		// - chain will not exist (even if others look similar), append new
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
		this.#triggerEvent(chainId);
	}

	#handledNotEmittedQueue: Parameters<QueueHandler>[] = [];
	#emitter = createNanoEvents<PendingRpcEvents>();

	#triggerEvent(chainId: RpcChainId) {
		const chain = this.#queuedChains.get(chainId) ?? null;
		const rpcChainOnly = chain?.rpc ?? [];
		if (rpcChainOnly.length === 0) return;
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
			if (metadata.handled) return; // this should ony be new RPC
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
	/**
	 * Process RPC after a certain amount of time has passed since the last call
	 * in a chain (batching)
	 */
	Batch,
}

export type QueueHandler = (
	/** Unhandled, new RPC which may reference RPC from previous chains */
	newRpc: RpcFunctionCall[],
	/** All RPC that makes up the given chain, including handled calls, for context */
	allRpc: RpcFunctionCall[],
) => Promise<unknown>[];

// TODO: consider removing dedicated batch option and combining it with the
// remaining options by adding a "batchTimeout" property
// - the Call option with a timeout would behave the same as Batch today
// - the Keyword and External options would have a leading timeout while Call
//   option would have a trailing timeout, when timeout is configured
export type HandleOnOptions =
	| { event: HandleEvent.Call }
	| {
			event: HandleEvent.External;
	  }
	| {
			event: HandleEvent.Keyword;
			keywords: PropertyKey[];
	  }
	| {
			event: HandleEvent.Batch;
			timeout: number;
	  };

const RpcIdSymbol: unique symbol = Symbol();
export type RpcChainId = Opaque<string, typeof RpcIdSymbol>;
export function createRpcChainId(rpcIds: RpcId[]): RpcChainId {
	return castToRpcChainId(rpcIds.join("/"));
}
export function castToRpcChainId(rpcIdChain: string): RpcChainId {
	return castToOpaque<RpcChainId>(rpcIdChain);
}

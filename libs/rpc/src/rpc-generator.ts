import { isPromise } from "es-toolkit";
import {
	CallCatcher,
	type CallCondition,
	CaughtCallType,
	type CaughtId,
	type CaughtStack,
	CaughtType,
} from "./call-catcher";
import {
	createRpcId,
	type RpcFunctionCall,
	type RpcId,
} from "./types/rpc-structure";
import { UnknownAsync } from "./unknown-async";
import { isIterator } from "./utils/is-iterable";

/**
 * Capture all function calls on an object and record them as RPCs. Captured
 * options can include direct function calls, method calls on objects, chained
 * methods, and curried functions.
 *
 * The intent of the class is to capture access on the object's proxy as RPC,
 * in a format that could be eventually serialized. This class only handles
 * method calls, and does not serialize arguments or deserialize returned
 * values. This should instead be handled by a separate class that's expected
 * to serialize these values into RPC events.
 *
 * All handled function calls will be returned back to the caller as an async
 * value, either as a promise or an async iterator because it's expected that
 * the returned value is remote and will not immediately be available.
 */
export class RpcGenerator<T> extends CallCatcher<T> {
	#handler: MethodCallHandler;

	/**
	 * Recorded IDs that have been utilized in an RPC call. Once recorded, the ID
	 * can no longer be used for new method calls (a variant must be used instead)
	 * but it can be used while extending chains with new method calls, up until
	 * the ID has been recorded in `#endedIds` (in which case, the chain can no
	 * longer be used).
	 */
	#openedIds = new Map<RpcId, number>();
	/**
	 * Recorded IDs for which a result has been received for an RPC and can no
	 * longer be used to form new chains. Once an RPC ID is recorded as "ended",
	 * calling a method on the result of another method will mean that the entire
	 * chain and each ID in the chain is no longer valid. The behavior will depend
	 * on how the client is configured but may either result in an error where no
	 * IDs are generated from the chain or all IDs in the chain are regenerated
	 * with new variants of those IDs.
	 */
	#endedIds = new Set<RpcId>();

	/**
	 * Get the current RPC ID for a caught ID without incrementing.
	 * Returns the most recent version of this ID.
	 */
	#getCurrentRpcId(id: CaughtId): RpcId {
		const baseId = createRpcId(id);
		const currentInc = this.#openedIds.get(baseId) ?? 0;
		return createRpcId(id, currentInc);
	}

	/**
	 * Create a new RPC ID, optionally incrementing if needed.
	 * @param id The caught ID to convert
	 * @param incrementAndTrack Whether to increment the ID (e.g., for new calls or ended IDs)
	 * @param trackNew Whether to track this ID for future increments
	 */
	#createNewRpcId(
		id: CaughtId,
		incrementAndTrack: boolean,
		trackNew: boolean,
	): RpcId {
		const baseId = createRpcId(id);
		const currentIncrementValue = this.#openedIds.get(baseId) ?? 0;
		const currentRpcId = createRpcId(id, currentIncrementValue);
		const idEnded = this.#endedIds.has(currentRpcId);
		const needsIncrement = incrementAndTrack || idEnded;
		const incrementAmount = needsIncrement ? 1 : 0;
		const newIncrementValue = currentIncrementValue + incrementAmount;
		const newOpenId = !this.#openedIds.has(baseId);
		const trackNewId = trackNew && newOpenId;
		const throwOnSameId = this.#chainEndBehavior === "throw";
		if (needsIncrement && throwOnSameId) throw new Error("RPC chain ended");
		if (needsIncrement || trackNewId)
			this.#openedIds.set(baseId, newIncrementValue);
		const newOrExistingId = createRpcId(id, newIncrementValue);
		return newOrExistingId;
	}

	/**
	 * If a remote host no longer has access to a specific result (for example,
	 * the connection is closed), this method should be called with all relevant
	 * IDs that were utilized in that connection. This may either reference an
	 * entire chain from beginning to end, or start at any point in an existing
	 * chain and continue to the end of the chain.
	 *
	 * This only needs to be called if there is no automatic method to determine
	 * when an ID should be discarded. If new RPC IDs can only be used once, for
	 * example, then this method is not necessary.
	 */
	endChain(chainIds: RpcId | RpcId[]): void {
		const chainIdList = Array.isArray(chainIds) ? chainIds : [chainIds];
		for (const id of chainIdList) this.#endedIds.add(id);
	}

	#startOrUpdateChain(unprocessedChain: CaughtId[]): RpcId[] {
		const currentRpcIds = unprocessedChain.map((id) =>
			this.#getCurrentRpcId(id),
		);
		const regenerateFrom = currentRpcIds.findIndex((id) =>
			this.#endedIds.has(id),
		);
		const regenerationNeeded = regenerateFrom !== -1;
		const okayIds = !regenerationNeeded
			? currentRpcIds
			: currentRpcIds.slice(0, regenerateFrom);
		if (regenerationNeeded) {
			// IDs that were previously used need incrementing, new IDs start fresh
			const newIds = unprocessedChain
				.slice(regenerateFrom)
				.map((id, index, chain) => {
					const isFirst = index === 0;
					const isLast = index === chain.length - 1;
					const baseId = createRpcId(id);
					const wasUsed = this.#openedIds.has(baseId);
					const shouldIncrement = isFirst || wasUsed;
					return this.#createNewRpcId(id, shouldIncrement, isLast);
				});
			const updatedChain = [...okayIds, ...newIds];
			return updatedChain;
		}
		const updatedChain = unprocessedChain.map((id, index, chain) => {
			const isLast = index === chain.length - 1;
			return this.#createNewRpcId(id, false, isLast);
		});
		return updatedChain;
	}

	#convertStackToRpc(stack: CaughtStack): RpcFunctionCall[] {
		const newIds = this.#startOrUpdateChain(stack.map((caught) => caught.id));
		// Create a map from caught IDs to their regenerated RPC IDs
		const idMap = new Map<CaughtId, RpcId>();
		for (const [index, caught] of stack.entries()) {
			idMap.set(caught.id, newIds[index]);
		}
		// at this point, all properties should've become calls
		const rpcChain = stack
			.map((caught, index) => {
				if (caught.type !== CaughtType.Call) return null;
				// Use the mapped chain ID instead of regenerating from caught.chain
				const chainId = caught.chain ? (idMap.get(caught.chain) ?? null) : null;
				return {
					id: newIds[index],
					method: caught.path.map((part) => part.toString()),
					new: caught.callMethod === CaughtCallType.Constructor,
					args: caught.args,
					chain: chainId,
				};
			})
			.filter((given) => given !== null);
		return rpcChain;
	}

	#chainEndBehavior: "throw" | "new" = "new"; // note: the default might change in the future
	#handleOnBehavior: HandleOnOption = { event: "call" };

	constructor(handler: MethodCallHandler, options?: RpcGeneratorOptions) {
		const callCondition: CallCondition = (next, stack) => {
			const caught = stack.at(-1);
			if (!caught) return next;
			const funcCall = caught.type === CaughtType.Call;
			const asyncMethod = UnknownAsync.determineCaughtType(caught);
			const isModuleCall = funcCall && !asyncMethod;
			if (!isModuleCall) return next;
			const unknownAsync = new UnknownAsync();
			// note: UnknownAsync and RpcGenerator use the same callback and must use
			// the same root CallCatcher instance to continue generating unique IDs
			unknownAsync.setInitialStack(stack, false, this);
			unknownAsync.fallbackSet(callCondition);
			const runHandler = async (stack: CaughtStack) => {
				try {
					const skip = Symbol();
					const rpc = this.#convertStackToRpc(stack);
					const value = await this.#handler(rpc, skip);
					if (skip === value) {
						return unknownAsync.giveNothing();
					} else if (isPromise(value)) {
						unknownAsync.givePromise(value);
					} else if (isIterator(value)) {
						unknownAsync.giveIterator(value);
					} else {
						unknownAsync.givePromise(value);
					}
				} catch (error) {
					unknownAsync.givePromise(Promise.reject(error));
				}
			};
			void runHandler(stack);
			return unknownAsync.proxy;
		};
		super(callCondition, {
			callFunction: true,
			callConstructor: true,
			propAccess: true,
		});
		this.#handler = handler;
		this.#chainEndBehavior = options?.chainEndBehavior ?? "new";
		this.#handleOnBehavior = options?.handleOn ?? { event: "call" };
	}
}

export type MethodCallHandler = (
	stack: RpcFunctionCall[],
	skip: symbol,
	// biome-ignore lint/suspicious/noExplicitAny: value could be anything
) => any;

type ChainEndBehavior = "throw" | "new";
type HandleOnOption =
	| {
			event: "call";
	  }
	| {
			event: "await";
	  }
	| {
			event: "keyword";
			keyword: string;
			accessType: "method" | "property";
	  }
	| {
			event: "debounce";
			timeout: number;
	  };

export type RpcGeneratorOptions = {
	/**
	 * When a chain of method calls is ended, there are two possible behaviors:
	 *
	 * - `'throw'`: any further method calls on the chain will throw an error
	 * - `'new'`: any further method calls on the chain will generate new RPC
	 *
	 * @default 'new'
	 */
	chainEndBehavior?: ChainEndBehavior;
	/**
	 * The provided handler can be called on various events:
	 *
	 * - `'call'`: the handler is called as soon as a function is called
	 * - `'awaited'`: the handler is called when a function is awaited
	 * - `'keyword'`: the handler is called when a special keyword in a method
	 *   or property is used (event parameters must be provided)
	 * - `'debounce'`: the handler is called after a period of inactivity
	 *   following a method call (event parameters must be provided)
	 *
	 * @default { event: 'call' }
	 */
	handleOn?: HandleOnOption;
};

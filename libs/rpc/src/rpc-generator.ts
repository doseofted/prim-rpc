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
	 * Recorded chain of method calls represented by a merged list of IDs that
	 * points to the original IDs in that chain. If one of these IDs in the chain
	 * is added to `#endedIds`, anything after it in the chain also becomes
	 * invalid and must have an ID regenerated.
	 */
	#chainedIdSequences = new Map<string, RpcId[]>();

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

	#createChainIdentifier(chainIds: RpcId[]) {
		return chainIds.join("/");
	}

	/**
	 * If a remote host no longer has access to a specific result (for example,
	 * the connection is closed), this method should be called with all relevant
	 * IDs that were utilized in that connection.
	 *
	 * This only needs to be called if there is no automatic method to determine
	 * when an ID should be discarded. If new RPC IDs can only be used once, for
	 * example, then this method is not necessary.
	 */
	endChainOrPartOfChain(chainIds: RpcId[]) {
		// const chainId = this.#createChainIdentifier(chainIds);
		// this.#chainedIdSequences.delete(chainId);
		for (const [i] of chainIds.entries()) {
			// look for all possible chains that could be affected
			const chainId = this.#createChainIdentifier(chainIds.slice(0, i + 1));
			this.#chainedIdSequences.delete(chainId);
		}
		for (const id of chainIds) {
			this.#endedIds.add(id);
			// this.#openedIds.delete(id);
		}
	}

	#createNewRpcId(id: CaughtId, chain = false, i = 1): RpcId {
		const originalRpcId = createRpcId(id);
		const exists = this.#openedIds.has(originalRpcId);
		let inc = exists ? (this.#openedIds.get(originalRpcId) ?? 0) : 0;
		inc += chain ? 0 : exists ? i : 0;
		if (!chain) this.#openedIds.set(originalRpcId, inc);
		if (!chain)
			console.log("New RPC ID", {
				id,
				originalRpcId,
				inc,
				chain,
				exists,
			});
		return createRpcId(id, inc);
	}

	#retrieveCurrentRpcId(id: CaughtId): RpcId {
		// we treat this as a chain because we don't want to increment the ID
		return this.#createNewRpcId(id, true);
	}

	#startOrUpdateChain(unprocessedChain: CaughtId[]): RpcId[] {
		const chainIds = unprocessedChain.map((id) =>
			this.#retrieveCurrentRpcId(id),
		);
		const chainEndIndex = chainIds.findIndex((id) => this.#endedIds.has(id));
		if (chainEndIndex !== -1) {
			// part of the chain has ended, so we need to regenerate IDs from that point
			const okayIds = chainIds.slice(0, chainEndIndex);
			const endedIds = chainIds.slice(chainEndIndex);
			this.endChainOrPartOfChain(endedIds);
			const newIds = unprocessedChain
				.slice(chainEndIndex)
				.map((id, i) => this.#createNewRpcId(id));
			return [...okayIds, ...newIds];
		}
		// return chainIds
		return unprocessedChain.map((id) => this.#createNewRpcId(id, false, 0));

		// const chainSeenBefore = this.#createChainIdentifier(chainIds);
		// const newId = chainIds.pop();
		// const existingChainId = this.#createChainIdentifier(chainIds);
		// const existingChain = this.#chainedIdSequences.get(existingChainId) ?? [];
		// const endedIndex = existingChain.findIndex((id) => this.#endedIds.has(id));
		// const existingChainIncludesEnded = endedIndex !== -1
		// if (existingChainIncludesEnded) {
		// 	const endedIds = existingChain.slice(endedIndex);
		// 	const okayIds = existingChain.slice(0, endedIndex);
		// 	const newIds = unprocessedChain
		// 		.slice(endedIndex)
		// 		.map((id) => this.#createNewRpcId(id));
		// 	this.endChainOrPartOfChain(endedIds);
		// 	return [...okayIds, ...newIds];
		// }
		// const existingChainExists = existingChain.length > 0
		// if (existingChainExists) {
		// 	const newId = this.#createNewRpcId()
		// 	const updatedChain = [...existingChain, ];
		// }
	}

	#convertStackToRpc(stack: CaughtStack): RpcFunctionCall[] {
		const newIds = this.#startOrUpdateChain(stack.map((caught) => caught.id));
		// console.log(newIds);
		return stack // NOTE: at this point, all properties should've become calls
			.map((caught) => {
				if (caught.type !== CaughtType.Call) return null;
				return {
					id: newIds.shift(),
					method: caught.path.map((part) => part.toString()),
					new: caught.callMethod === CaughtCallType.Constructor,
					args: caught.args,
					chain: caught.chain ? this.#createNewRpcId(caught.chain, true) : null,
				};
			})
			.filter((given) => given !== null);
	}

	// todo: add option to only call handler when promise is resolved (potential config option for RPC client)
	// todo: add ability to throw error if same function is called twice (potential config option for RPC client)

	// IDEA: instead of always incrementing RPC IDs when calls they're called multiple times,
	// instead only duplicate once an event is received that the connection has been terminated
	// for that ID (and after that point, any call after that in the chain will either
	// require a new ID or will result in an error, because it can't be used anymore)

	constructor(handler: MethodCallHandler) {
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
					console.log(rpc);
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
	}
}

export type MethodCallHandler = (
	stack: RpcFunctionCall[],
	skip: symbol,
	// biome-ignore lint/suspicious/noExplicitAny: value could be anything
) => any;

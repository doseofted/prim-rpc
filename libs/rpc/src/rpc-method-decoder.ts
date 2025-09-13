import { isNullish } from "emery";
import { intersection, isFunction } from "es-toolkit";
import { get as getProperty } from "es-toolkit/compat";
import type { PartialDeep, Schema } from "type-fest";
import type { RpcFunctionCall, RpcId } from "./types/rpc-messages";

/**
 * Decode RPC into function calls on a provided object or function and receive
 * two values: the returned value and a decoder that can decode further
 * RPCs that may be chained from the original function call.
 */
export class RpcMethodDecoder<T> {
	#module: unknown;
	#allowedSchema: unknown | undefined;
	#allowedFunctionMethods: string[];
	constructor(
		providedModule: T,
		allowedSchema?: PartialSchema<T>,
		allowedFunctionMethods?: string[],
	) {
		this.#module = providedModule;
		this.#allowedSchema = allowedSchema ?? {};
		this.#allowedFunctionMethods = allowedFunctionMethods ?? [];
	}

	#parentChainId: RpcId | null;

	#decodeResultAsObject(result: unknown, originalId: RpcId | null = null) {
		const decoder = new RpcMethodDecoder(result);
		decoder.#parentChainId = originalId;
		return { result, decoder };
	}

	/**
	 * Once it's determined that a function isn't a property of another function
	 * in the path (or that method of a function is allowed), determine if the
	 * requested function is allowed to be called.
	 *
	 * A function may only be called if it has a property `rpc` set to `true` or
	 * another supported value or if it is explicitly allowed in a provided
	 * schema.
	 */
	#givenIsRpcFunction(
		given: unknown,
		methodName: string[],
	): given is (...args: unknown[]) => unknown {
		if (intersection(functionDenyList, methodName).length > 0) return false;
		const givenIsFunc = isFunction(given);
		const isRpcFunction = givenIsFunc && "rpc" in given && given.rpc === true;
		const isAllowedFunction =
			getProperty(this.#allowedSchema, methodName) === true;
		return isRpcFunction || isAllowedFunction;
	}

	attemptCall(rpc: RpcFunctionCall): {
		result: unknown;
		decoder: RpcMethodDecoder<unknown>;
	} {
		const parentId = this.#parentChainId;
		if (!isNullish(parentId) && rpc.chain !== parentId) {
			throw new Error(
				`RPC chain ID "${rpc.chain}" does not match expected chain ID "${parentId}"`,
			);
		}
		const moduleProvided = this.#module;
		if (isNullish(moduleProvided)) {
			throw new Error("Module is not provided");
		}
		// we now know the module is an object
		const methodName =
			typeof rpc.method === "string" ? [rpc.method] : rpc.method;
		const moduleIsRpcFunction = this.#givenIsRpcFunction(
			moduleProvided,
			methodName,
		);
		if (methodName.length === 0 && !moduleIsRpcFunction) {
			// we want to attempt calling the module as a function, but it isn't
			throw new Error(
				"RPC method is empty but provided module is not a function",
			);
		}
		if (methodName.length === 0 && moduleIsRpcFunction) {
			// we want to attempt calling the module as a function
			const returned = moduleProvided(...rpc.args);
			return this.#decodeResultAsObject(returned, rpc.id);
		}
		if (typeof moduleProvided !== "object") {
			throw new Error("Module is not an object with properties");
		}
		// we now know the intended target is a property of the module
		const functionIndexesInPath: number[] = [];
		methodName.slice(0, -1).reduce((a, b, i) => {
			const property = a.concat(b);
			const found = getProperty(moduleProvided, property);
			if (isFunction(found)) functionIndexesInPath.push(i);
			return property;
		}, [] as string[]);
		const functionsInPath = functionIndexesInPath.length > 0;
		const method = functionsInPath
			? null
			: getProperty(moduleProvided, methodName);
		const rpcMethodOnModule =
			method && this.#givenIsRpcFunction(method, methodName);
		if (rpcMethodOnModule) {
			// we want to attempt calling the method of the module
			const returned = method(...rpc.args);
			return this.#decodeResultAsObject(returned, rpc.id);
		}
		// we now know that the target is a method of an RPC function
		const parentMethodPath = methodName.slice(0, -1);
		const lastPossibleMethodIndex = parentMethodPath.length - 1;
		const deepMethodOfMethod =
			functionIndexesInPath.includes(lastPossibleMethodIndex) &&
			functionIndexesInPath.length > 1;
		if (deepMethodOfMethod) {
			// methods on an RPC function can only be one level deep
			throw new Error(
				`RPC method "${methodName.join(
					".",
				)}" is not a function on the provided module`,
			);
		}
		// we now know that the target is the direct method of a function
		const methodOnMethodName = methodName.at(-1);
		const methodOnMethodAllowed =
			this.#allowedFunctionMethods.includes(methodOnMethodName) &&
			!functionDenyList.includes(methodOnMethodName);
		const parentMethod = methodOnMethodAllowed
			? getProperty(moduleProvided, parentMethodPath)
			: null;
		const parentIsRpcMethod = this.#givenIsRpcFunction(
			parentMethod,
			parentMethodPath,
		);
		const methodOnMethodCanBeCalled =
			parentIsRpcMethod && methodOnMethodAllowed;
		if (methodOnMethodCanBeCalled) {
			// we want to attempt a call to an allowed method of a valid RPC function on the module
			const methodOnMethod = getProperty(moduleProvided, methodName);
			const result = methodOnMethod(...rpc.args);
			return this.#decodeResultAsObject(result, rpc.id);
		}
		// any other attempt to call a function is not allowed
		throw new Error(
			`RPC method "${methodName.join(
				".",
			)}" is not a function on the provided module`,
		);
	}
}

type PartialSchema<T> = PartialDeep<
	Schema<T, true, { recurseIntoArrays: true }>
>;

const functionDenyList = [
	"prototype",
	"__proto__",
	"constructor",
	"toString",
	"toLocaleString",
	"valueOf",
	"apply",
	"bind",
	"call",
	"arguments",
	"caller",
];

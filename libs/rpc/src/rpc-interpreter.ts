import { isNullish } from "emery";
import { intersection, isFunction, isPlainObject } from "es-toolkit";
import { get as getProperty } from "es-toolkit/compat";
import type { PartialDeep, Schema } from "type-fest";
import type { RpcFunctionCall, RpcId } from "./types/rpc-structure";
import { isIterator } from "./utils/is-iterable";

/**
 * Decode RPC into function calls on a provided object or function and receive
 * two values: the returned value and a decoder that can decode further
 * RPCs that may be chained from the original function call.
 */
export class RpcInterpreter<T> {
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

	#decodeResultAsRpc(
		result: unknown,
		originalId: RpcId | null = null,
		schema: PartialSchema<unknown>,
	) {
		const funcMethods = this.#allowedFunctionMethods;
		const decoder = new RpcInterpreter(result, schema, funcMethods);
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
		const schemaValue = getProperty(this.#allowedSchema, methodName);
		const isAllowedSchemaDirect = schemaValue === true;
		const isAllowedSchemaWithItems =
			isPlainObject(schemaValue) &&
			Object.values(schemaValue).some((v) => v === true);
		const isAllowedSchema = isAllowedSchemaDirect || isAllowedSchemaWithItems;
		return isRpcFunction || isAllowedSchema;
	}

	get #validModule() {
		const moduleProvided = this.#module;
		if (isNullish(moduleProvided)) {
			throw new RpcInterpreterError(ReusableMessages.ModuleNotProvided);
		}
		const moduleIsObject =
			typeof moduleProvided === "object" || isFunction(moduleProvided);
		if (!moduleIsObject) {
			throw new RpcInterpreterError(ReusableMessages.ModuleIsInvalid);
		}
		return moduleProvided;
	}

	callMethod(rpc: RpcFunctionCall): {
		result: unknown;
		decoder: RpcInterpreter<unknown>;
	} {
		const moduleProvided = this.#validModule;
		const parentId = this.#parentChainId;
		const isChain = !isNullish(rpc.chain);
		const invalidChain = isChain && rpc.chain !== parentId;
		if (invalidChain) {
			throw new RpcInterpreterError(ReusableMessages.MethodChainDoesNotExist);
		}

		// we now know the module is an object
		const methodName =
			typeof rpc.method === "string" ? [rpc.method] : rpc.method;
		const subSchema = getProperty(this.#allowedSchema, methodName);
		const moduleIsRpcFunction = this.#givenIsRpcFunction(
			moduleProvided,
			methodName,
		);
		const moduleIsNotFunction = methodName.length === 0 && !moduleIsRpcFunction;
		if (moduleIsNotFunction) {
			// we want to attempt calling the module as a function, but it isn't
			throw new RpcInterpreterError(ReusableMessages.FunctionDoesNotExist);
		}
		const callModuleAsFunction = methodName.length === 0 && moduleIsRpcFunction;
		if (callModuleAsFunction) {
			// we want to attempt calling the module as a function
			const returned = moduleProvided(...rpc.args);
			return this.#decodeResultAsRpc(returned, rpc.id, subSchema);
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
			return this.#decodeResultAsRpc(returned, rpc.id, subSchema);
		}

		// we now know that the target is a method of an RPC function object
		if (this.#allowedFunctionMethods.length === 0) {
			// if method names are not explicitly allowed, this feature is disabled
			throw new RpcInterpreterError(ReusableMessages.FunctionDoesNotExist);
		}
		const parentMethodPath = methodName.slice(0, -1);
		const lastPossibleMethodIndex = parentMethodPath.length - 1;
		const deepMethodOfMethod =
			functionIndexesInPath.includes(lastPossibleMethodIndex) &&
			functionIndexesInPath.length > 1;
		if (deepMethodOfMethod) {
			// methods on an RPC function can only be one level deep
			throw new RpcInterpreterError(ReusableMessages.FunctionDoesNotExist);
		}
		// we now know that the target is the direct method of a function
		const methodOnMethodName = methodName.at(-1);
		const methodOnMethodAllowed =
			methodOnMethodName &&
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
		const methodOnMethod = getProperty(moduleProvided, methodName);
		const methodOnMethodIsFunction = isFunction(methodOnMethod);
		if (!methodOnMethodIsFunction) {
			// function does not exist on the function object
			throw new RpcInterpreterError(ReusableMessages.FunctionDoesNotExist);
		}
		if (methodOnMethodCanBeCalled) {
			// we want to attempt a call to an allowed method of a valid RPC function object on the module
			const result = methodOnMethod(...rpc.args);
			return this.#decodeResultAsRpc(result, rpc.id, subSchema);
		}

		// any other attempt to call a function is not allowed
		throw new RpcInterpreterError(ReusableMessages.FunctionDoesNotExist);
	}

	async *callChain(rpcStack: RpcStack): AsyncGenerator<unknown> {
		const isExpectedGenerator = isFunction(rpcStack);
		const isStack =
			Array.isArray(rpcStack) || isExpectedGenerator || isIterator(rpcStack);
		if (!isStack) return this.callChain([rpcStack]);
		let nextDecoder: RpcInterpreter<unknown> = this;
		const rpcIterable = isExpectedGenerator ? rpcStack() : rpcStack;
		for await (const rpcMessage of rpcIterable) {
			const { result, decoder } = nextDecoder.callMethod(rpcMessage);
			yield result;
			nextDecoder = decoder;
		}
	}
}

type RpcStackIterable =
	| AsyncGenerator<RpcFunctionCall>
	| Generator<RpcFunctionCall>;
type RpcStack =
	| (() => RpcStackIterable)
	| RpcStackIterable
	| RpcFunctionCall[]
	| RpcFunctionCall;

enum ReusableMessages {
	ModuleNotProvided = "Module is not provided",
	ModuleIsInvalid = "Module is not a function or an object",
	FunctionDoesNotExist = "Provided method name is not a function on the module",
	MethodChainDoesNotExist = "Provided method chain does not reference a called function",
}
export class RpcInterpreterError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RpcMethodDecoderError";
	}
}

export type RecursiveRpcCheck = true | { [key: string]: RecursiveRpcCheck };
export type PartialSchema<T> = PartialDeep<
	Schema<T, RecursiveRpcCheck, { recurseIntoArrays: true }>
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

import { describe, expect, test } from "vitest";
import { RpcMethodDecoder, RpcMethodDecoderError } from "./rpc-method-decoder";
import { createRpcId } from "./types/rpc-messages";

describe("RpcMethodDecoder can call a function given as RPC", () => {
	function add(a: number, b: number) {
		return a + b;
	}
	add.rpc = true;

	test("can decode a function call on a module", () => {
		const decoder = new RpcMethodDecoder({ add });
		const { result } = decoder.attemptCall({
			method: "add",
			args: [2, 3],
		});
		expect(result).toBe(5);
	});

	test("can decode a function call when module is a function", () => {
		const decoder = new RpcMethodDecoder(add);
		const { result } = decoder.attemptCall({
			method: [],
			args: [2, 3],
		});
		expect(result).toBe(5);
	});

	test("can decode a function call when function is nested in module", () => {
		const decoder = new RpcMethodDecoder({ please: [{ add }] });
		const { result } = decoder.attemptCall({
			method: ["please", "0", "add"],
			args: [2, 3],
		});
		expect(result).toBe(5);
	});

	test("can decode a method call on a valid RPC function", () => {
		function multiply(a: number, b: number) {
			return a * b;
		}
		multiply.docs = () => "This is a multiply function";
		const decoder = new RpcMethodDecoder({ multiply }, { multiply: true }, [
			"docs",
		]);
		const { result } = decoder.attemptCall({
			method: ["multiply", "docs"],
			args: [],
		});
		expect(result).toBe("This is a multiply function");
	});

	test("can decode a chained call on a valid RPC function", () => {
		function addAndCurry(a: number) {
			function add(b: number) {
				return a + b;
			}
			add.rpc = true;
			return { add };
		}
		addAndCurry.rpc = true;
		const decoder = new RpcMethodDecoder({ addAndCurry });
		const id = createRpcId(1);
		const { decoder: decoderCurry } = decoder.attemptCall({
			method: ["addAndCurry"],
			args: [2],
			chain: null,
			id,
		});
		const { result } = decoderCurry.attemptCall({
			method: ["add"],
			args: [3],
			id: createRpcId(2),
			chain: id,
		});
		expect(result).toBe(5);
	});
});

describe("RpcMethodDecoder throws on invalid calls", () => {
	function addNoRpc(a: number, b: number) {
		return a + b;
	}
	function add(a: number, b: number) {
		return a + b;
	}
	add.rpc = true;

	test("throws when module is not provided", () => {
		const decoder = new RpcMethodDecoder(null);
		expect(() => {
			decoder.attemptCall({
				method: ["add"],
				args: [2, 3],
			});
		}).toThrow(RpcMethodDecoderError);
	});

	test("throws when method is not a function", () => {
		const decoder = new RpcMethodDecoder({});
		expect(() => {
			decoder.attemptCall({
				method: "add",
				args: [2, 3],
			});
		}).toThrow(RpcMethodDecoderError);
	});

	test("throws when method is in deny list", () => {
		const decoder = new RpcMethodDecoder({ toString: add });
		expect(() => {
			decoder.attemptCall({
				method: "toString",
				args: [2, 3],
			});
		}).toThrow(RpcMethodDecoderError);
	});

	test("throws when method is not marked as RPC", () => {
		const decoder = new RpcMethodDecoder({ add: addNoRpc });
		expect(() => {
			decoder.attemptCall({
				method: "add",
				args: [2, 3],
			});
		}).toThrow(RpcMethodDecoderError);
	});

	test("throws when method is valid RPC but parent path includes function", () => {
		function someFunction() {
			return 123;
		}
		someFunction.rpc = true; // this shouldn't change anything
		someFunction.test = { add };
		const decoder = new RpcMethodDecoder({ someFunction });
		expect(() => {
			decoder.attemptCall({
				method: ["someFunction", "test", "add"],
				args: [2, 3],
			});
		}).toThrow(RpcMethodDecoderError);
	});
});

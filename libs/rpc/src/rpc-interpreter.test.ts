import { describe, expect, test, vi } from "vitest";
import { createCaughtId } from "./call-catcher";
import { RpcInterpreter, RpcInterpreterError } from "./rpc-interpreter";
import { createRpcId } from "./types/rpc-structure";

describe("RpcInterpreter can call a function given as RPC", () => {
	function add(a: number, b: number) {
		return a + b;
	}
	add.rpc = true;

	test("can decode a function call on a module", () => {
		const decoder = new RpcInterpreter({ add });
		const { result } = decoder.callMethod({
			method: "add",
			args: [2, 3],
		});
		expect(result).toBe(5);
	});

	test("can decode a function call when module is a function", () => {
		const decoder = new RpcInterpreter(add);
		const { result } = decoder.callMethod({
			method: [],
			args: [2, 3],
		});
		expect(result).toBe(5);
	});

	test("can decode a function call when function is nested in module", () => {
		const decoder = new RpcInterpreter({ please: [{ add }] });
		const { result } = decoder.callMethod({
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
		const decoder = new RpcInterpreter({ multiply }, { multiply: true }, [
			"docs",
		]);
		const { result } = decoder.callMethod({
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
		const decoder = new RpcInterpreter({ addAndCurry });
		const chain = createRpcId(createCaughtId(1));
		const { decoder: decoderCurry } = decoder.callMethod({
			method: ["addAndCurry"],
			args: [2],
			chain: null,
			id: chain,
		});
		const { result } = decoderCurry.callMethod({
			method: ["add"],
			args: [3],
			id: createRpcId(createCaughtId(2)),
			chain,
		});
		expect(result).toBe(5);
	});

	test("can decode a chained call, given the full chain initially", async () => {
		function addAndCurry(a: number) {
			function add(b: number) {
				return a + b;
			}
			add.rpc = true;
			return { add };
		}
		addAndCurry.rpc = true;

		const decoder = new RpcInterpreter({ addAndCurry });
		const results = decoder.callChain(function* () {
			const chain = createRpcId(createCaughtId(1));
			yield {
				method: ["addAndCurry"],
				args: [2],
				chain: null,
				id: chain,
			};
			yield {
				method: ["add"],
				args: [3],
				id: createRpcId(createCaughtId(2)),
				chain,
			};
		});
		const cb = vi.fn();
		for await (const result of results) {
			cb(result);
		}
		expect(cb).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				add: expect.any(Function),
			}),
		);
		expect(cb).toHaveBeenNthCalledWith(2, 5);
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
		const decoder = new RpcInterpreter(null);
		expect(() => {
			decoder.callMethod({
				method: ["add"],
				args: [2, 3],
			});
		}).toThrow(RpcInterpreterError);
	});

	test("throws when method is not a function", () => {
		const decoder = new RpcInterpreter({});
		expect(() => {
			decoder.callMethod({
				method: "add",
				args: [2, 3],
			});
		}).toThrow(RpcInterpreterError);
	});

	test("throws when method is in deny list", () => {
		const decoder = new RpcInterpreter({ toString: add });
		expect(() => {
			decoder.callMethod({
				method: "toString",
				args: [2, 3],
			});
		}).toThrow(RpcInterpreterError);
	});

	test("throws when method is not marked as RPC", () => {
		const decoder = new RpcInterpreter({ add: addNoRpc });
		expect(() => {
			decoder.callMethod({
				method: "add",
				args: [2, 3],
			});
		}).toThrow(RpcInterpreterError);
	});

	test("throws when method is valid RPC but parent path includes function", () => {
		function someFunction() {
			return 123;
		}
		someFunction.rpc = true; // this shouldn't change anything
		someFunction.test = { add };
		const decoder = new RpcInterpreter({ someFunction });
		expect(() => {
			decoder.callMethod({
				method: ["someFunction", "test", "add"],
				args: [2, 3],
			});
		}).toThrow(RpcInterpreterError);
	});
});

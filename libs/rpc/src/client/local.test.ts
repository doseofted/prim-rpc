import { describe, expect, test } from "vitest"
import { handleLocalModuleMethod } from "./local"
import { PrimOptions, RpcCall } from "../interfaces"

const exampleModule = {
	hello(name?: string) {
		return ["Hello", name].filter(given => given).join(" ")
	},
	anError() {
		throw "Uh-oh"
	},
}

describe("local client works with static import", () => {
	const options = {
		module: exampleModule,
	} satisfies PrimOptions

	test("without error", () => {
		const rpc: RpcCall<string, unknown[]> = {
			method: "hello",
			args: ["Ted"],
		}
		const result = handleLocalModuleMethod(rpc, options)
		expect(result).toBe("Hello Ted")
	})

	test("with error", () => {
		const rpc: RpcCall<string, unknown[]> = {
			method: "anError",
			args: [],
		}
		const result = () => handleLocalModuleMethod(rpc, options)
		expect(result).toThrow("Uh-oh")
	})
})

describe("local client works with dynamic import and function wrapper", () => {
	const options = {
		module: () => Promise.resolve(exampleModule),
	} satisfies PrimOptions

	test("without error", async () => {
		const rpc: RpcCall<string, unknown[]> = {
			method: "hello",
			args: ["Ted"],
		}
		const result = handleLocalModuleMethod(rpc, options)
		await expect(result).resolves.toBe("Hello Ted")
	})

	test("with error", async () => {
		const rpc: RpcCall<string, unknown[]> = {
			method: "anError",
			args: [],
		}
		const result = handleLocalModuleMethod(rpc, options)
		await expect(result).rejects.toBe("Uh-oh")
	})
})

describe("local client works pre/post hooks", () => {
	const options = {
		module: exampleModule,
		preRequest(args, name) {
			if (name === "anError") return { result: "Fixed it" }
			return {
				args: args.map(arg => (typeof arg === "string" ? arg.toUpperCase() : arg)),
			}
		},
		postRequest(args, result, name) {
			if (name === "hello" && args[0] === "STRANGER")
				return typeof result === "string" ? result.replace(/^Hello/, "Good Morning") : result
		},
	} satisfies PrimOptions

	test("pre-hook with modified args", () => {
		const rpc: RpcCall<string, unknown[]> = {
			method: "hello",
			args: ["Ted"],
		}
		const result = handleLocalModuleMethod(rpc, options)
		expect(result).toBe("Hello TED")
	})

	test("pre-hook with modified result", () => {
		const rpc: RpcCall<string, unknown[]> = {
			method: "anError",
			args: [],
		}
		const result = () => handleLocalModuleMethod(rpc, options)
		expect(result()).toBe("Fixed it")
		expect(result).not.toThrow("Uh-oh")
	})

	test("post-hook with modified result", () => {
		const rpc: RpcCall<string, unknown[]> = {
			method: "hello",
			args: ["stranger"],
		}
		const result = handleLocalModuleMethod(rpc, options)
		expect(result).toBe("Good Morning STRANGER")
	})
})

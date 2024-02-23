// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any -- Test the unexpected */
/* eslint-disable @typescript-eslint/no-unsafe-call -- Test the unexpected */
/* eslint-disable @typescript-eslint/no-unsafe-member-access -- Test the unexpected */
/* eslint-disable @typescript-eslint/no-unsafe-return -- Test the unexpected */

import { describe, test, expect } from "vitest"
import { JsonHandler, createPrimClient, createPrimServer } from "."
import type * as exampleClient from "@doseofted/prim-example"
import * as exampleServer from "@doseofted/prim-example"
import jsonHandler from "superjson"
import { createPrimTestingPlugins } from "./testing"
import { File } from "node:buffer"
import { encode as msgPack, decode as msgUnpack } from "@msgpack/msgpack"
import { featureFlags } from "./flags"

const module = exampleServer
type IModule = typeof exampleClient

describe("Prim client instantiates", () => {
	// use case: not sure yet, possibly to return optimistic local result while waiting on remote result
	test("with local module", () => {
		const prim = createPrimClient({ module })
		expect(typeof prim.sayHelloAlternative === "function").toBeTruthy()
	})
	// use case: to contact remote server from client app (most common)
	test("with remote module", () => {
		const prim = createPrimClient<IModule>()
		expect(typeof prim.sayHello === "function").toBeTruthy()
	})
})

describe("Prim Client can call methods with a single parameter", () => {
	test("with local source", async () => {
		const prim = createPrimClient({ module })
		const args = { greeting: "Hi", name: "Ted" }
		const expected = module.sayHello(args)
		const result = await prim.sayHello(args)
		expect(result).toEqual(expected)
	})
	test("with local source, dynamic import", async () => {
		const prim = createPrimClient({ module: import("@doseofted/prim-example") })
		const args = { greeting: "Hi", name: "Ted" }
		const expected = module.sayHello(args)
		const result = await prim.sayHello(args)
		expect(result).toEqual(expected)
	})
	test("with local source, function that returns dynamic import", async () => {
		const prim = createPrimClient({ module: () => import("@doseofted/prim-example") })
		const args = { greeting: "Hi", name: "Ted" }
		const expected = module.sayHello(args)
		const result = await prim.sayHello(args)
		expect(result).toEqual(expected)
	})
	test("with remote source", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const prim = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
		const args = { greeting: "Hey", name: "Ted" }
		const expected = module.sayHello(args)
		const result = await prim.sayHello(args)
		expect(result).toEqual(expected)
	})
})

describe("Prim Client cannot call non-RPC", () => {
	test("with exported object", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const prim = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
		const functionCall1 = () => (prim as any).superSecret.myApiKey()
		expect(prim.superSecret).toBeTypeOf("function")
		await expect(functionCall1()).rejects.toThrow("Method was not callable")
		const functionCall2 = () => (prim as any).superSecret2()
		await expect(functionCall2()).rejects.toThrow("Method was not callable")
	})
	test("with function not in allow list", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const prim = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
		const functionCall = () => prim.definitelyNotRpc()
		await expect(functionCall()).rejects.toThrow("Method was not allowed")
	})
	test("with method on method that's not allowed", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		// We pass some made-up method-on-method name because if none are given then no methods on methods are allowed
		// and I need to test to make sure that the allow list is working
		createPrimServer({ module, callbackHandler, methodHandler, methodsOnMethods: ["somethingMadeUp"] })
		const prim = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
		// below is not valid because it's in Prim RPC's deny list
		const functionCall1 = () => prim.greetings.toString()
		await expect(functionCall1()).rejects.toThrow("Method was not valid")
		// this is not valid because, while the method-on-method is allowed, it's called on the prototype
		const functionCall2 = () => prim.lookAtThisMess.prototype.somethingMadeUp()
		await expect(functionCall2()).rejects.toThrow("Method was not valid")
		// below is not valid because "docs" method-on-method is not in the allowed list
		const functionCall3 = () => prim.lookAtThisMess.docs()
		await expect(functionCall3()).rejects.toThrow("Method on method was not allowed")
		// below is not valid because method-on-method is not defined directly on a function
		const functionCall4 = () => (prim.lookAtThisMess as any).messy.technicallyNotRpc("Hi", "there")
		await expect(functionCall4()).rejects.toThrow("Method on method was not valid")
	})
})

describe("Prim Client can call methods with positional parameters", () => {
	test("with local source", async () => {
		const prim = createPrimClient({ module })
		const args = ["Hi", "Ted"] as const
		const expected = module.sayHelloAlternative(...args)
		const result = await prim.sayHelloAlternative(...args)
		expect(result).toEqual(expected)
	})
	test("with remote source", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const prim = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
		const args = ["Hey", "Ted"] as const
		const expected = module.sayHelloAlternative(...args)
		const result = await prim.sayHelloAlternative(...args)
		expect(result).toEqual(expected)
	})
})

test("Prim Client can call allowed methods on methods", async () => {
	const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
	// JSON handler is only useful with remote source (no local source test needed)
	createPrimServer({ module, callbackHandler, methodHandler, methodsOnMethods: ["docs"] })
	const prim = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
	const expected = module.lookAtThisMess.docs()
	const result = await prim.lookAtThisMess.docs()
	expect(result).toEqual(expected)
})

/** An example using msgpack */
const binaryJsonHandler: JsonHandler = {
	stringify: msgPack,
	parse: msgUnpack,
	binary: true,
	mediaType: "application/octet-stream",
}

// JSON handler is only useful with remote source (no local source test needed)
describe("Prim Client can use alternative JSON handler", () => {
	test("string (actual JSON)", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		const commonOptions = { jsonHandler }
		createPrimServer({ ...commonOptions, module, callbackHandler, methodHandler })
		const prim = createPrimClient<IModule>({ ...commonOptions, callbackPlugin, methodPlugin })
		const date = new Date()
		const expected = module.whatIsDayAfter(date)
		const result = await prim.whatIsDayAfter(date)
		expect(result).toEqual(expected)
		expect(result).toBeInstanceOf(Date)
	})
	test("binary (not JSON)", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		const commonOptions = { jsonHandler: binaryJsonHandler, handleBlobs: false }
		createPrimServer({ ...commonOptions, module, callbackHandler, methodHandler })
		const prim = createPrimClient<IModule>({ ...commonOptions, callbackPlugin, methodPlugin })
		const date = new Date()
		const expected = module.whatIsDayAfter(date)
		const result = await prim.whatIsDayAfter(date)
		expect(result).toEqual(expected)
		expect(result).toBeInstanceOf(Date)
	})
})

describe("Prim Client can call deeply nested methods", () => {
	test("with local source", async () => {
		const prim = createPrimClient({ module })
		const args = { greeting: "Sup", name: "Ted" }
		const expected = module.testLevel2.testLevel1.sayHello(args)
		const result = await prim.testLevel2.testLevel1.sayHello(args)
		expect(result).toEqual(expected)
	})
	test("with remote source", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const prim = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
		const args = { greeting: "Yo", name: "Ted" }
		const expected = module.testLevel2.testLevel1.sayHello(args)
		const result = await prim.testLevel2.testLevel1.sayHello(args)
		expect(result).toEqual(expected)
	})
})

describe("Prim Client can handle binary data", () => {
	test("with local source, download", async () => {
		const prim = createPrimClient({ module })
		const args = ["Hi Ted!"] as const
		const expected = await module.makeItATextFile(...args)
		const result = await prim.makeItATextFile(...args)
		expect(result).toBeInstanceOf(File)
		void expect(result.text()).resolves.toEqual(await expected.text())
	})
	test("with remote source, download", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const prim = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
		const args = ["Hi Ted!"] as const
		const expected = await module.makeItATextFile(...args)
		const result = await prim.makeItATextFile(...args)
		expect(result).toBeInstanceOf(File)
		void expect(result.text()).resolves.toEqual(await expected.text())
	})
	test("with local source, upload", async () => {
		const prim = createPrimClient({ module })
		const args = [new File(["Hi Ted!"], "test.txt")] as const
		const expected = module.uploadTheThing(...args)
		const result = await prim.uploadTheThing(...args)
		void expect(result).toMatchObject(expected)
	})
	test("with remote source, upload", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const prim = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
		const args = [new File(["Hi Ted!"], "test.txt")] as const
		const expected = module.uploadTheThing(...args)
		const result = await prim.uploadTheThing(...args)
		void expect(result).toMatchObject(expected)
	})

	// NOTE: while a binary handler is used in the following tests, it's not used for the File/Blob because their methods
	// are asynchronous and most JSON handlers don't support this option (they're synchronous like default JSON), but it
	// is important that Files/Blobs can still be used and extracted from JSON with a binary handler, so I'll test it.

	test("with remote source, upload and binary handler", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		const jsonHandler = binaryJsonHandler
		// NOTE: File/Blobs are still extracted from JSON
		const commonOptions = { jsonHandler, handleBlobs: true }
		createPrimServer({ ...commonOptions, module, callbackHandler, methodHandler })
		const prim = createPrimClient<IModule>({ ...commonOptions, callbackPlugin, methodPlugin })
		const args = [new File(["Hi Ted!"], "test.txt")] as const
		const expected = module.uploadTheThing(...args)
		const result = await prim.uploadTheThing(...args)
		void expect(result).toMatchObject(expected)
	})
})

describe("Prim Client can throw errors", () => {
	const expected = (() => {
		try {
			return module.oops()
		} catch (error) {
			if (error instanceof Error) {
				return error.message
			}
			return "?"
		}
	})()
	test("with local source", () => {
		const prim = createPrimClient({ module })
		const result = () => prim.oops()
		expect(result).toThrow(expected)
	})
	test("with remote source, default JSON handler", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const prim = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
		const result = () => prim.oops()
		await expect(result()).rejects.toThrow(expected)
		await expect(result()).rejects.toBeInstanceOf(Error)
	})
	test("with remote source and custom JSON handler", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		const commonOptions = { jsonHandler }
		createPrimServer({ ...commonOptions, module, callbackHandler, methodHandler })
		// const { client, socket } = newTestClients({ ...commonOptions, module })
		const prim = createPrimClient<IModule>({ ...commonOptions, callbackPlugin, methodPlugin })
		const result = () => prim.oops()
		await expect(result()).rejects.toThrow(expected)
		await expect(result()).rejects.toBeInstanceOf(Error)
	})
})

describe("Prim Client can make use of callbacks", () => {
	test("with local source", async () => {
		const prim = createPrimClient({ module })
		const results = await new Promise<string[]>(resolve => {
			const results: string[] = []
			void prim.withCallback(message => {
				results.push(message)
				if (results.length === 2) {
					resolve(results)
				}
			})
		})
		expect(results).toEqual(["You're using Prim.", "Still using Prim!"])
	})
	test("with remote source", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const prim = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
		const results = await new Promise<string[]>(resolve => {
			const results: string[] = []
			void prim.withCallback(message => {
				results.push(message)
				if (results.length === 2) {
					resolve(results)
				}
			})
		})
		expect(results).toEqual(["You're using Prim.", "Still using Prim!"])
	})
})

if (featureFlags.supportPromises) {
	test("Prim Client can handle return of multiple promises", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler, jsonHandler })
		const prim = createPrimClient<IModule>({ callbackPlugin, methodPlugin, jsonHandler })
		const expected = module.promisesUnwrapped(10)
		// FIXME: callback is needed to use callback plugin (otherwise method plugin is used which doesn't support promises)
		const result = await prim.promisesUnwrapped(10, () => "uh oh")
		console.log({ result })
		expect(result.hi).toEqual(expected.hi)
		expect(result.date).toBeInstanceOf(Date)
		expect(result.navigation).toBeInstanceOf(Promise)
		expect(result.posts).toBeInstanceOf(Promise)
		await expect(result.navigation).resolves.toBeInstanceOf(Array)
		await expect(result.posts).resolves.toBeInstanceOf(Array)
	})
}

// TODO: consider case where callbacks are used and result is returned (withCall)
// this could be tested by testing a function:
// `typeMessage(msg: string, transform: "upper"|"lower"|"none", cb: (letter: string) => void): string`
// (typeMessage return type is void today)

describe("Prim Client can batch RPC calls over HTTP", () => {
	test("when all results are successful", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const prim = createPrimClient<IModule>({ callbackPlugin, methodPlugin, clientBatchTime: 15 })
		// NOTE: can't seem to narrow down chosen type for array (linked possibly related issue)
		// LINK: https://github.com/microsoft/TypeScript/issues/27808
		const calls = <M extends typeof prim | typeof module>(m: M) => [
			m.sayHello({ greeting: "Hi", name: "Ted" }),
			m.sayHelloAlternative("Hey", "Ted"),
		]
		const expected = calls(module)
		const result = Promise.all(calls(prim))
		await expect(result).resolves.toEqual(expected)
	})

	test("when a result is an error", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const prim = createPrimClient<IModule>({ callbackPlugin, methodPlugin, clientBatchTime: 15 })
		const calls = <M extends typeof prim | typeof module>(m: M) => {
			// NOTE: for this test, it's important that functions are not awaited so that they are called within batch time
			const results: unknown[] = []
			results.push(m.sayHello({ greeting: "Hi", name: "Ted" }))
			results.push(m.sayHelloAlternative("Hey", "Ted"))
			try {
				results.push(m.oops())
			} catch (error) {
				results.push(error)
			}
			return results
		}
		const expected = calls(module)
		const result = Promise.allSettled(calls(prim)).then(list => list.map(r => ("value" in r ? r.value : r.reason)))
		await expect(result).resolves.toEqual(expected)
	})
})

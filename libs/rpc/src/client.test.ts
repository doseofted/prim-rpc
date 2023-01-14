import { describe, test, expect } from "vitest"
import { createPrimClient, createPrimServer } from "."
import type * as exampleClient from "@doseofted/prim-example"
import * as exampleServer from "@doseofted/prim-example"
import type { PrimServerOptions } from "./interfaces"
import jsonHandler from "superjson"
import { createPrimTestingPlugins } from "./testing"

const module = exampleServer
type IModule = typeof exampleClient

describe("Prim client instantiates", () => {
	// use case: not sure yet, possibly to return optimistic local result while waiting on remote result
	test("with local module", () => {
		const { client: prim } = createPrimClient({ module })
		expect(typeof prim.sayHelloAlternative === "function").toBeTruthy()
	})
	// use case: to contact remote server from client app (most common)
	test("with remote module", () => {
		const { client: prim } = createPrimClient<IModule>()
		expect(typeof prim.sayHello === "function").toBeTruthy()
	})
})

describe("Prim Client can call methods with a single parameter", () => {
	test("with local source", async () => {
		const { client: prim } = createPrimClient({ module })
		const params = { greeting: "Hi", name: "Ted" }
		const expected = module.sayHello(params)
		const result = await prim.sayHello(params)
		expect(result).toEqual(expected)
	})
	test("with remote source", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const { client: prim } = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
		const params = { greeting: "Hey", name: "Ted" }
		const expected = module.sayHello(params)
		const result = await prim.sayHello(params)
		expect(result).toEqual(expected)
	})
})

describe("Prim Client can call methods with positional parameters", () => {
	test("with local source", async () => {
		const { client: prim } = createPrimClient({ module })
		const params = ["Hi", "Ted"] as const
		const expected = module.sayHelloAlternative(...params)
		const result = await prim.sayHelloAlternative(...params)
		expect(result).toEqual(expected)
	})
	test("with remote source", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const { client: prim } = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
		const params = ["Hey", "Ted"] as const
		const expected = module.sayHelloAlternative(...params)
		const result = await prim.sayHelloAlternative(...params)
		expect(result).toEqual(expected)
	})
})

test("Prim Client can use alternative JSON handler", async () => {
	const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
	// JSON handler is only useful with remote source (no local source test needed)
	const commonOptions: PrimServerOptions = { jsonHandler }
	createPrimServer({ ...commonOptions, module, callbackHandler, methodHandler })
	const { client: prim } = createPrimClient<IModule>({ ...commonOptions, callbackPlugin, methodPlugin })
	const date = new Date()
	const expected = module.whatIsDayAfter(date)
	const result = await prim.whatIsDayAfter(date)
	expect(result).toEqual(expected)
	expect(result).toBeInstanceOf(Date)
})

describe("Prim Client can call deeply nested methods", () => {
	test("with local source", async () => {
		const { client: prim } = createPrimClient({ module })
		const params = { greeting: "Sup", name: "Ted" }
		const expected = module.testLevel2.testLevel1.sayHello(params)
		const result = await prim.testLevel2.testLevel1.sayHello(params)
		expect(result).toEqual(expected)
	})
	test("with remote source", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const { client: prim } = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
		const params = { greeting: "Yo", name: "Ted" }
		const expected = module.testLevel2.testLevel1.sayHello(params)
		const result = await prim.testLevel2.testLevel1.sayHello(params)
		expect(result).toEqual(expected)
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
		const { client: prim } = createPrimClient({ module })
		const result = () => prim.oops()
		expect(result).toThrow(expected)
	})
	test("with remote source, default JSON handler", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const { client: prim } = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
		const result = () => prim.oops()
		await expect(result()).rejects.toThrow(expected)
		await expect(result()).rejects.toBeInstanceOf(Error)
	})
	test("with remote source and custom JSON handler", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		const commonOptions = { jsonHandler }
		createPrimServer({ ...commonOptions, module, callbackHandler, methodHandler })
		// const { client, socket } = newTestClients({ ...commonOptions, module })
		const { client: prim } = createPrimClient<IModule>({ ...commonOptions, callbackPlugin, methodPlugin })
		const result = () => prim.oops()
		await expect(result()).rejects.toThrow(expected)
		await expect(result()).rejects.toBeInstanceOf(Error)
	})
})

describe("Prim Client can make use of callbacks", () => {
	test("with local source", async () => {
		const { client: prim } = createPrimClient({ module })
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
		const { client: prim } = createPrimClient<IModule>({ callbackPlugin, methodPlugin })
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

// TODO: consider case where callbacks are used and result is returned (withCall)
// this could be tested by testing a function:
// `typeMessage(msg: string, transform: "upper"|"lower"|"none", cb: (letter: string) => void): string`
// (typeMessage return type is void today)

describe("Prim Client can batch RPC calls over HTTP", () => {
	test("when all results are successful", async () => {
		const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
		createPrimServer({ module, callbackHandler, methodHandler })
		const { client: prim } = createPrimClient<IModule>({ callbackPlugin, methodPlugin, clientBatchTime: 15 })
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
		const { client: prim } = createPrimClient<IModule>({ callbackPlugin, methodPlugin, clientBatchTime: 15 })
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
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		const result = Promise.allSettled(calls(prim)).then(list => list.map(r => ("value" in r ? r.value : r.reason)))
		await expect(result).resolves.toEqual(expected)
	})
})

/**
 * NOTE: this is currently handled primarily by plugins so tests should be written there (for now).
 * Once some sort of "blob handler" is used in Prim (see `blobHandler` idea) then these tests can be expanded on.
 */
// test("Prim Client can send binary contents", async () => {
// 	const { client, socket, callbackHandler, methodHandler } = createPrimTestingPlugins()
// 	createPrimServer({ module, callbackHandler, methodHandler })
// 	const prim = createPrimClient<IModule>({ client, socket, clientBatchTime: 15 })
// 	const result = await prim.createImaginaryProfile({/* ... */})
// })

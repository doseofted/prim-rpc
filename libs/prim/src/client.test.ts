import { describe, test, expect } from "vitest"
import { createPrimClient } from "."
import type * as exampleClient from "@doseofted/prim-example"
import * as exampleServer from "@doseofted/prim-example"
import type { PrimServerOptions } from "./interfaces"
import jsonHandler from "superjson"
import { newTestClients } from "./preparation.test"

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

describe("Prim Client can call methods directly", () => {
	test("with local source", async () => {
		const prim = createPrimClient({ module })
		const params = { greeting: "Hi", name: "Ted" }
		const expected = module.sayHello(params)
		const result = await prim.sayHello(params)
		expect(result).toEqual(expected)
	})
	test("with remote source", async () => {
		const { client, socket } = newTestClients({ module })
		const prim = createPrimClient<IModule>({ client, socket })
		const params = { greeting: "Hey", name: "Ted" }
		const expected = module.sayHello(params)
		const result = await prim.sayHello(params)
		expect(result).toEqual(expected)
	})
})

test("Prim Client can use alternative JSON handler", async () => {
	// JSON handler is only useful with remote source (no local source test needed)
	const commonOptions: PrimServerOptions = { jsonHandler }
	const { client, socket } = newTestClients({ ...commonOptions, module })
	const prim = createPrimClient<IModule>({ ...commonOptions, client, socket })
	const date = new Date()
	const expected = module.whatIsDayAfter(date)
	const result = await prim.whatIsDayAfter(date)
	expect(result).toEqual(expected)
	expect(result).toBeInstanceOf(Date)
})

describe("Prim Client can call deeply nested methods", () => {
	test("with local source", async () => {
		const prim = createPrimClient({ module })
		const params = { greeting: "Sup", name: "Ted" }
		const expected = module.testLevel2.testLevel1.sayHello(params)
		const result = await prim.testLevel2.testLevel1.sayHello(params)
		expect(result).toEqual(expected)
	})
	test("with remote source", async () => {
		const { client, socket } = newTestClients({ module })
		const prim = createPrimClient<IModule>({ client, socket })
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
			if (error instanceof Error) { return error.message }
			return "?"
		}
	})()
	test("with local source", () => {
		const prim = createPrimClient({ module })
		const result = () => prim.oops()
		expect(result).toThrow(expected)
	})
	test("with remote source, default JSON handler", async () => {
		const { client, socket } = newTestClients({ module })
		const prim = createPrimClient<IModule>({ client, socket })
		const result = () => prim.oops()
		await expect(result()).rejects.toThrow(expected)
		await expect(result()).rejects.toBeInstanceOf(Error)
	})
	test("with remote source and custom JSON handler", async () => {
		const commonOptions = { jsonHandler }
		const { client, socket } = newTestClients({ ...commonOptions, module })
		const prim = createPrimClient<IModule>({ ...commonOptions, client, socket })
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
			void prim.withCallback((message) => {
				results.push(message)
				if (results.length === 2) {
					resolve(results)
				}
			})
		})
		expect(results).toEqual(["You're using Prim.", "Still using Prim!"])
	})
	test("with remote source", async () => {
		const { client, socket } = newTestClients({ module })
		const prim = createPrimClient<IModule>({ client, socket })
		const results = await new Promise<string[]>(resolve => {
			const results: string[] = []
			void prim.withCallback((message) => {
				results.push(message)
				if (results.length === 2) {
					resolve(results)
				}
			})
		})
		expect(results).toEqual(["You're using Prim.", "Still using Prim!"])
	})
})

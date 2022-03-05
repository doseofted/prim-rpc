import { createPrimClient, createPrimServer } from "./index"
import type * as exampleClient from "example"
import * as exampleServer from "example"

describe("Prim instantiates", () => {
	test("Client-side instantiation", () => {
		const prim = createPrimClient<typeof exampleClient>()
		expect(typeof prim.sayHello === "function").toBeTruthy()
	})
	test("Server-side instantiation", () => {
		const prim = createPrimClient({ server: true }, exampleServer)
		expect(typeof prim.sayHelloAlternative === "function").toBeTruthy()
	})
})

describe("Prim-Client can call methods directly", () => {
	test("Locally", async () => {
		const { sayHello } = createPrimClient({ server: true }, exampleServer)
		const result = await sayHello({ greeting: "Hey", name: "Ted" })
		expect(result).toEqual("Hey Ted!")
	})
	test("Remotely", async () => {
		const { sayHello } = createPrimClient<typeof exampleClient>({
			client: async () => ({ result: await exampleServer.sayHello({ greeting: "Hey", name: "Ted" }) })
		})
		const result = await sayHello({ greeting: "Hey", name: "Ted" })
		expect(result).toEqual("Hey Ted!")
	})
})

describe("Prim-Client can call deeply nested methods", () => {
	test("Locally", async () => {
		const prim = createPrimClient({ server: true }, exampleServer)
		const result = await prim.testLevel2.testLevel1.sayHello({ greeting: "Hey", name: "Ted" })
		expect(result).toEqual("Hey Ted!")
	})
	test("Remotely", async () => {
		const prim = createPrimClient<typeof exampleClient>({
			client: async () => ({ result: await exampleServer.sayHello({ greeting: "Hey", name: "Ted" }) })
		})
		const result = await prim.testLevel2.testLevel1.sayHello({ greeting: "Hey", name: "Ted" })
		expect(result).toEqual("Hey Ted!")
	})
})

describe("Prim-Client can throw errors", () => {
	test("Locally", async () => {
		const { oops } = createPrimClient({ server: true }, exampleServer)
		expect(() => { oops() }).toThrow("My bad.")
	})
	test("Remotely", () => {
		const { oops } = createPrimClient<typeof exampleClient>({
			client: async () => ({
				error: { code: 1, message: "My bad." }
			})
		})
		// LINK https://jestjs.io/docs/expect#rejects
		expect(async () => {
			await oops()
		}).rejects.toThrow("My bad.")
	})
})

describe("Prim-Server can call methods", () => {
	test("Locally", async () => {
		const prim = createPrimServer({ server: true }, exampleServer)
		const result = await prim({
			body: {
				id: 1,
				method: "testLevel2/testLevel1/sayHello",
				params: [{ greeting: "Hey", name: "Ted" }]
			}
		})
		expect(result).toEqual({ result: "Hey Ted!", id: 1 })
	})
	test("From another Prim-Server", async () => {
		const primServer = createPrimServer({ server: true }, exampleServer)
		const primRemoteServer = createPrimServer({
			client: async (body) => primServer({ body })
		}, exampleServer)
		const result = await primRemoteServer({
			body: {
				id: 1,
				method: "testLevel2/testLevel1/sayHello",
				params: [{ greeting: "Hey", name: "Ted" }]
			}
		})
		expect(result).toEqual({ result: "Hey Ted!", id: 1 })
	})
})

import { createPrimClient, createPrimServer } from "."
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
	// LINK https://jestjs.io/docs/expect#rejects
	test("Locally", async () => {
		const { oops } = createPrimClient({ server: true }, exampleServer)
		expect(async () => { await oops() }).rejects.toThrow("My bad.")
	})
	test("Remotely", () => {
		const { oops } = createPrimClient<typeof exampleClient>({
			client: async () => ({
				error: { code: 1, message: "My bad." }
			})
		})
		expect(async () => {
			await oops()
		}).rejects.toThrow("My bad.")
	})
})

describe("Prim-Client can use callbacks", () => {
	// LINK https://jestjs.io/docs/expect#rejects
	test("Locally", (done) => {
		const { withCallback } = createPrimClient({ server: true }, exampleServer)
		const results = []
		withCallback((message) => {
			results.push(message)
			if (results.length === 2) {
				expect(results).toEqual(["You're using Prim.", "Still using Prim!"])
				done()
			}
		})
	})
	/* test("Remotely", (done) => {
		const results = []
		const send = (msg: string) => results.push(msg)
		const { withCallback } = createPrimClient<typeof exampleClient>({
			socket(_endpoint, _response, _end) {
				return { send }
			}
		})
		withCallback((message) => {
			results.push(message)
			if (results.length === 2) {
				expect(results).toEqual(["You're using Prim.", "Still using Prim!"])
				done()
			}
		})
	}) */
})

describe("Prim-Server can call methods with RPC", () => {
	test("Locally", async () => {
		const prim = createPrimServer({ server: true }, exampleServer)
		const result = await prim({
			body: {
				id: 1,
				method: "testLevel2/testLevel1/sayHello",
				params: { greeting: "Hey", name: "Ted" }
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
				params: { greeting: "Hey", name: "Ted" }
			}
		})
		expect(result).toEqual({ result: "Hey Ted!", id: 1 })
	})
})

describe("Prim-Server can call methods with RPC via URL", () => {
	test("Locally", async () => {
		const prim = createPrimServer({ server: true }, exampleServer)
		const result = await prim({
			url: "/prim/testLevel2/testLevel1/sayHello?-id=1&greeting=Hey&name=Ted",
			prefix: "/prim"
		})
		expect(result).toEqual({ result: "Hey Ted!", id: "1" })
	})
	test("From another Prim-Server", async () => {
		const primServer = createPrimServer({ server: true }, exampleServer)
		const primRemoteServer = createPrimServer({
			client: async (body) => primServer({ body })
		}, exampleServer)
		const result = await primRemoteServer({
			url: "/prim/testLevel2/testLevel1/sayHelloAlternative?-id=1&-=Hey&-=Ted",
			prefix: "/prim"
		})
		expect(result).toEqual({ result: "Hey Ted!", id: "1" })
	})
})

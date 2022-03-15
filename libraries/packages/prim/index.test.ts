import { createPrimClient, createPrimServer, RpcCall } from "."
import type * as exampleClient from "example"
import * as exampleServer from "example"
// import { createNanoEvents } from "nanoevents"

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
	// TODO: ensure that this is testing events for websockets correctly (as a real websocket would work)
	test("Remotely", (done) => {
		const results = []
		// const event = createNanoEvents()
		// event.emit("response", { result: "some response" })
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let responseRef: any = undefined
		const { withCallback } = createPrimClient<typeof exampleClient>({
			socket(_endpoint, { connected, response }) {
				responseRef = response
				const send = (_msg: RpcCall) => {
					// const id = msg.id
					// response({ result: "some response" })
					// response({ result: "some response" })
				}
				setTimeout(() => {
					connected()
				}, 300)
				return { send }
			},
			client: async (_endpoint, json) => {
				if (Array.isArray(json)) {
					// NOTE: list of RPC calls isn't used here
					return
				}
				setTimeout(() => {
					responseRef({ result: "some response", id: json.params[0] })
					responseRef({ result: "some response", id: json.params[0] })
				}, 500);
				return { id: json.id }
			},
			// internal: { event }
		})
		withCallback((message) => {
			results.push(message)
			if (results.length === 2) {
				expect(results).toEqual(["some response", "some response"])
				done()
			}
		})
	})
})

describe("Prim-Server can call methods with RPC", () => {
	test("Locally", async () => {
		const prim = createPrimServer(exampleServer, { server: true })
		const result = await prim.rpc({
			body: {
				id: 1,
				method: "testLevel2/testLevel1/sayHello",
				params: { greeting: "Hey", name: "Ted" }
			}
		})
		expect(result).toEqual({ result: "Hey Ted!", id: 1 })
	})
	test("From another Prim-Server", async () => {
		const primServer = createPrimServer(exampleServer, { server: true })
		const primRemoteServer = createPrimServer(exampleServer, {
			client: async (body) => primServer.rpc({ body })
		})
		const result = await primRemoteServer.rpc({
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
		const prim = createPrimServer(exampleServer, { server: true })
		const result = await prim.rpc({
			url: "/prim/testLevel2/testLevel1/sayHello?-id=1&greeting=Hey&name=Ted",
			prefix: "/prim"
		})
		expect(result).toEqual({ result: "Hey Ted!", id: "1" })
	})
	test("From another Prim-Server", async () => {
		const primServer = createPrimServer(exampleServer, { server: true })
		const primRemoteServer = createPrimServer(exampleServer, {
			client: async (body) => primServer.rpc({ body })
		})
		const result = await primRemoteServer.rpc({
			url: "/prim/testLevel2/testLevel1/sayHelloAlternative?-id=1&-=Hey&-=Ted",
			prefix: "/prim"
		})
		expect(result).toEqual({ result: "Hey Ted!", id: "1" })
	})
})

// TODO: write test for batch calls over HTTP
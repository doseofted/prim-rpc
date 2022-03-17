import { createPrimClient, createPrimServer, RpcCall } from "."
import type * as exampleClient from "example"
import * as exampleServer from "example"
// import { createNanoEvents } from "nanoevents"

// TODO: update tests so that each remote call makes a request to Prim Server (instead of generating a fake response from Prim client)

describe("Prim instantiates", () => {
	// use case: not sure yet, possibly to return optimistic local result while waiting on remote result
	test("client instantiation, local source", () => {
		const prim = createPrimClient({ server: true }, exampleServer)
		expect(typeof prim.sayHelloAlternative === "function").toBeTruthy()
	})
	// use case: to contact remote server from client app (most common)
	test("client instantiation, remote source", () => {
		const prim = createPrimClient<typeof exampleClient>()
		expect(typeof prim.sayHello === "function").toBeTruthy()
	})
	// use case: to respond to client app (most common)
	test("server instantiation, local source", () => {
		const prim = createPrimServer(exampleServer)
		expect(typeof prim.rpc === "function").toBeTruthy()
	})
	// use case: to chain multiple Prim servers together
	test("server instantiation, remote source", () => {
		const prim = createPrimServer<typeof exampleClient>()
		expect(typeof prim.rpc === "function").toBeTruthy()
	})
})

describe("Prim-Client can call methods directly", () => {
	test("with local source", async () => {
		const { sayHello } = createPrimClient({ server: true }, exampleServer)
		const result = await sayHello({ greeting: "Hey", name: "Ted" })
		expect(result).toEqual("Hey Ted!")
	})
	test("with remote source", async () => {
		const prim = createPrimServer(exampleServer)
		const { sayHello } = createPrimClient<typeof exampleClient>({
			client: async (_endpoint, body) => prim.rpc( { body })
		})
		const result = await sayHello({ greeting: "Hey", name: "Ted" })
		expect(result).toEqual("Hey Ted!")
	})
})

describe("Prim-Client can call deeply nested methods", () => {
	test("with local source", async () => {
		const prim = createPrimClient({ server: true }, exampleServer)
		const result = await prim.testLevel2.testLevel1.sayHello({ greeting: "Hey", name: "Ted" })
		expect(result).toEqual("Hey Ted!")
	})
	test("with remote source", async () => {
		const prim = createPrimServer(exampleServer)
		const { testLevel2 } = createPrimClient<typeof exampleClient>({
			client: async (_endpoint, body) => prim.rpc({ body })
		})
		const result = await testLevel2.testLevel1.sayHello({ greeting: "Hey", name: "Ted" })
		expect(result).toEqual("Hey Ted!")
	})
})

describe("Prim-Client can throw errors", () => {
	// LINK https://jestjs.io/docs/expect#rejects
	test("with local source", async () => {
		const { oops } = createPrimClient({ server: true }, exampleServer)
		expect(async () => {
			await oops()
		}).rejects.toThrow("My bad.")
	})
	test("with remote source", () => {
		const prim = createPrimServer(exampleServer)
		const { oops } = createPrimClient<typeof exampleClient>({
			client: async (_endpoint, body) => prim.rpc({ body })
		})
		expect(async () => {
			await oops()
		}).rejects.toThrow("My bad.")
	})
})

describe("Prim-Client can use callbacks", () => {
	// LINK https://jestjs.io/docs/expect#rejects
	test("with local source", (done) => {
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
	test("with remote source", (done) => {
		const results = []
		const prim = createPrimServer(exampleServer)
		const { withCallback } = createPrimClient<typeof exampleClient>({
			socket(_endpoint, { connected, response, ended }) {
				prim.ws.on("response", (answer) => { response(answer) })
				prim.ws.on("end", () => { ended() })
				setTimeout(() => {
					connected()
				}, 0)
				// FIXME: find out why sending RPC call here causes error (webosocket still works?)
				const send = () => ({}) // (body: RpcCall) => { prim.rpc({ body }) }
				return { send }
			},
			client: async (_endpoint, body) => prim.rpc({ body })
		})
		withCallback((message) => {
			results.push(message)
			if (results.length === 2) {
				expect(results).toEqual(["You're using Prim.", "Still using Prim!"])
				done()
			}
		})
	})
})

describe("Prim-Server can call methods with RPC", () => {
	test("with local source", async () => {
		const prim = createPrimServer(exampleServer)
		const result = await prim.rpc({
			body: {
				id: 1,
				method: "testLevel2/testLevel1/sayHello",
				params: { greeting: "Hey", name: "Ted" }
			}
		})
		expect(result).toEqual({ result: "Hey Ted!", id: 1 })
	})
	test("from another Prim Server", async () => {
		const primServer = createPrimServer(exampleServer)
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
		const prim = createPrimServer(exampleServer)
		const result = await prim.rpc({
			url: "/prim/testLevel2/testLevel1/sayHello?-id=1&greeting=Hey&name=Ted",
			prefix: "/prim"
		})
		expect(result).toEqual({ result: "Hey Ted!", id: "1" })
	})
	test("From another Prim-Server", async () => {
		const primServer = createPrimServer(exampleServer)
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
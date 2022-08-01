import { describe, test, expect } from "vitest"
import { createPrimClient, createPrimServer } from "."
import type * as exampleClient from "@doseofted/prim-example"
import * as exampleServer from "@doseofted/prim-example"
import type { RpcAnswer } from "./interfaces"

// TODO: move tests to their own files where it makes sense
// for instance, functions in options.ts would be defined in options.test.ts

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
	// use case: to chain multiple Prim servers together (TODO feature itself not implemented yet)
	test("server instantiation, remote source", () => {
		const prim = createPrimServer<typeof exampleClient>()
		expect(typeof prim.rpc === "function").toBeTruthy()
	})
})

describe("Prim Client can call methods directly", () => {
	test("with local source", async () => {
		const { sayHello } = createPrimClient({ server: true }, exampleServer)
		const result = await sayHello({ greeting: "Hey", name: "Ted" })
		expect(result).toEqual("Hey Ted!")
	})
	test("with remote source", async () => {
		const prim = createPrimServer(exampleServer)
		const { sayHello } = createPrimClient<typeof exampleClient>({
			client: async (_endpoint, body) => prim.rpc( { body }),
		})
		const result = await sayHello({ greeting: "Hey", name: "Ted" })
		expect(result).toEqual("Hey Ted!")
	})
})

describe("Prim Client can call deeply nested methods", () => {
	test("with local source", async () => {
		const prim = createPrimClient({ server: true }, exampleServer)
		const result = await prim.testLevel2.testLevel1.sayHello({ greeting: "Hey", name: "Ted" })
		expect(result).toEqual("Hey Ted!")
	})
	test("with remote source", async () => {
		const prim = createPrimServer(exampleServer)
		const { testLevel2 } = createPrimClient<typeof exampleClient>({
			client: async (_endpoint, body) => prim.rpc({ body }),
		})
		const result = await testLevel2.testLevel1.sayHello({ greeting: "Hey", name: "Ted" })
		expect(result).toEqual("Hey Ted!")
	})
})

describe("Prim Client can throw errors", () => {
	// LINK https://jestjs.io/docs/expect#rejects
	test("with local source", () => {
		const { oops } = createPrimClient({ server: true }, exampleServer)
		expect(() => {
			oops()
		}).toThrow("My bad.")
	})
	test("with remote source", () => {
		const prim = createPrimServer(exampleServer)
		const { oops } = createPrimClient<typeof exampleClient>({
			client: async (_endpoint, body) => prim.rpc({ body }),
		})
		void expect(async () => {
			// eslint-disable-next-line @typescript-eslint/await-thenable
			await oops()
		}).rejects.toThrow("My bad.")
	})
})

describe("Prim Client can use callbacks", () => {
	// LINK https://jestjs.io/docs/expect#rejects
	test("with local source", async () => {
		await new Promise<void>(resolve => {
			const { withCallback } = createPrimClient({ server: true }, exampleServer)
			const results: string[] = []
			withCallback((message) => {
				results.push(message)
				if (results.length === 2) {
					expect(results).toEqual(["You're using Prim.", "Still using Prim!"])
					resolve()
				}
			})
		})
	})
	test("with remote source", async () => {
		await new Promise<void>(resolve => {
			const results: string[] = []
			const prim = createPrimServer(exampleServer)
			const { withCallback } = createPrimClient<typeof exampleClient>({
				socket(_endpoint, { connected, response, ended }) {
					prim.ws.on("response", (answer) => { response(answer) })
					prim.ws.on("ended", () => { ended() })
					setTimeout(() => {
						connected()
					}, 0)
					// FIXME: find out why sending RPC call here causes error (webosocket still works?)
					const send = () => ({}) // (body: RpcCall) => { prim.rpc({ body }) }
					return { send }
				},
				client: async (_endpoint, body) => prim.rpc({ body }),
			})
			withCallback((message) => {
				results.push(message)
				if (results.length === 2) {
					expect(results).toEqual(["You're using Prim.", "Still using Prim!"])
					resolve()
				}
			})
		})
	})
})

describe("Prim Server can call methods with RPC", () => {
	test("with local modules", async () => {
		const prim = createPrimServer(exampleServer)
		const result = await prim.rpc({
			body: {
				id: 1,
				method: "testLevel2/testLevel1/sayHello",
				params: { greeting: "Hey", name: "Ted" },
			},
		})
		expect(result).toEqual({ result: "Hey Ted!", id: 1 })
	})
	test("from another Prim Server", async () => {
		const primRemoteServer = createPrimServer(exampleServer)
		const primServer = createPrimServer<typeof exampleClient>(undefined, {
			server: false, // set to false so Prim will communicate with another server
			client: async (_endpoint, body) => primRemoteServer.rpc({ body }),
		})
		const result = await primServer.rpc({
			body: {
				id: 1,
				method: "testLevel2/testLevel1/sayHello",
				params: { greeting: "Hey", name: "Ted" },
			},
		})
		expect(result).toEqual({ result: "Hey Ted!", id: 1 })
	})
})

describe("Prim Server can call methods with RPC via URL", () => {
	test("Locally", async () => {
		const prim = createPrimServer(exampleServer)
		const result = await prim.rpc({
			url: "/prim/testLevel2/testLevel1/sayHello?-id=1&greeting=Hey&name=Ted",
			prefix: "/prim",
		})
		expect(result).toEqual({ result: "Hey Ted!", id: "1" })
	})
	test("From another Prim-Server", async () => {
		const primServer = createPrimServer(exampleServer)
		const primRemoteServer = createPrimServer(exampleServer, {
			client: async (body) => primServer.rpc({ body }),
		})
		const result = await primRemoteServer.rpc({
			url: "/prim/testLevel2/testLevel1/sayHelloAlternative?-id=1&-=Hey&-=Ted",
			prefix: "/prim",
		})
		expect(result).toEqual({ result: "Hey Ted!", id: "1" })
	})
})

// TODO: write test for batch calls over HTTP
describe("Prim can batch requests", () => {
	test("server can handle batch requests", async () => {
		const prim = createPrimServer(exampleServer)
		const answers = await prim.rpc({
			body: [
				{
					id: 1,
					method: "testLevel2/testLevel1/sayHello",
					params: { greeting: "Hey", name: "Ted" },
				},
				{
					id: 2,
					method: "testLevel2/testLevel1/sayHello",
					params: { greeting: "Hi", name: "Ted" },
				},
			],
		})
		const sorted = (answers as RpcAnswer[]).sort((a, b) => (a.id && b.id && a.id < b.id) ? -1 : 1)
		expect(sorted).toEqual([
			{ result: "Hey Ted!", id: 1 },
			{ result: "Hi Ted!", id: 2 },
		])
	})
	test("client understands responses from batch request", async () => {
		const prim = createPrimServer(exampleServer)
		const { sayHello, sayHelloAlternative } = createPrimClient<typeof exampleClient>({
			client: async (_endpoint, body) => prim.rpc({ body }),
			clientBatchTime: 300, // NOTE test result will take slightly longer than 300ms (only for test, usually <15ms)
		})
		const expected = [
			exampleServer.sayHello({ greeting: "Hey", name: "Ted" }),
			exampleServer.sayHelloAlternative("Hey", "Ted"),
		]
		const results = [
			sayHello({ greeting: "Hey", name: "Ted" }),
			sayHelloAlternative("Hey", "Ted"),
		]
		await expect(Promise.all(results)).resolves.toEqual(await Promise.all(expected))
	})
})

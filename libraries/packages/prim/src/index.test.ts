import { createPrim, RpcError, createPrimServer, RpcAnswer, createPrimV1 } from "./index"
import type * as exampleClient from "example"
import * as exampleServer from "example"

describe("V1: Prim instantiates", () => {
	test("Client-side instantiation", () => {
		const prim = createPrimV1<typeof exampleClient>()
		expect(typeof prim === "function").toBeTruthy()
	})
	test("Server-side instantiation", () => {
		const prim = createPrimV1({ server: true }, exampleServer)
		expect(typeof prim === "function").toBeTruthy()
	})
})

describe("V1: Arguments are given correctly", () => {
	const prim = createPrimV1<typeof exampleClient>({
		client: (body) => new Promise((r) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			r({ result: body.params as any })
		})
	})
	test("Positional arguments work", async () => {
		let greeting: string
		const args = ["Yo", "Ted"]
		try {
			greeting = await prim("sayHelloAlternative", ...args)
		} catch (error) {
			if (error instanceof RpcError) {
				console.log(error.message)
			}
		}
		expect(greeting).toEqual(args)
	})
	test("Object argument works", async () => {
		let greeting: string
		const body = { greeting: "Yo", name: "Ted" }
		try {
			greeting = await prim("sayHello", body)
		} catch (error) {
			if (error instanceof RpcError) {
				console.log(error.message)
			}
		}
		expect(greeting).toEqual(body)
	})
})

test("V1: Prim answers calls, server-side", async () => {
	const prim = createPrimV1({ server: true }, exampleServer)
	let greeting: string
	const response = "Yo Ted!"
	try {
		greeting = await prim("sayHello", { greeting: "Yo", name: "Ted" })
	} catch (error) {
		if (error instanceof RpcError) {
			console.log(error.message)
		}
	}
	expect(greeting).toEqual(response)
})

describe("Response works on client and server", () => {
	test("from client", async () => {
		const { sayHelloAlternative } = createPrim<typeof exampleClient>({
			client: async (jsonBody) => { // NOTE: mock client since fetch is unavailable, assume server sends right response
				const body = JSON.parse(JSON.stringify(jsonBody))
				const result = exampleServer.sayHelloAlternative(...body.params)
				const send: RpcAnswer = { result }
				return send
			}
		})
		expect(await sayHelloAlternative("Hey", "Ted")).toEqual("Hey Ted!")
	})
	test("from server", async () => {
		const created = createPrim({ server: true }, exampleServer)
		expect(await created.sayHello({ greeting: "Hey", name: "Ted" })).toBe("Hey Ted!")
	})
})

describe("Prim can be used from server framework", () => {
	test("using RPC call", async () => {
		const primServer = createPrimServer({ server: true }, exampleServer)
		const answer = primServer({
			method: "sayHello",
			params: [{ greeting: "Hey", name: "Ted"}]
		})
		expect((await answer).result).toEqual("Hey Ted!")
	})
})

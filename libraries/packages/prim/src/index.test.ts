import { createPrim, RpcError, proxyTest } from "./index"
import type * as exampleClient from "example"
import * as exampleServer from "example"

describe("Prim instantiates", () => {
	test("Client-side instantiation", () => {
		const prim = createPrim<typeof exampleClient>()
		expect(typeof prim === "function").toBeTruthy()
	})
	test("Server-side instantiation", () => {
		const prim = createPrim({ server: true }, exampleServer)
		expect(typeof prim === "function").toBeTruthy()
	})
})

describe("Arguments are given correctly", () => {
	const prim = createPrim<typeof exampleClient>({
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

test("Prim answers calls, server-side", async () => {
	const prim = createPrim({ server: true }, exampleServer)
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

describe("Proxy version works", () => {
	test("from client", async () => {
		const created = proxyTest<typeof exampleClient>()
		expect(await created.sayHelloAlternative("Hey", "Ted")).toEqual("test")
	})
	test("from server", async () => {
		const created = proxyTest(exampleServer)
		expect(created.sayHelloAlternative("Hey", "Ted")).toBe("Hey Ted!")
	})
})

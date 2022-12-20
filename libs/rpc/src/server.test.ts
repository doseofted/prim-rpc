import { describe, test, expect } from "vitest"
import { createPrimServer } from "."
import { RpcAnswer, RpcCall } from "./interfaces"
import type * as exampleClient from "@doseofted/prim-example"
import * as exampleServer from "@doseofted/prim-example"
import queryString from "query-string"
import { createPrimTestingPlugins } from "./testing"

const module = exampleServer
type IModule = typeof exampleClient

describe("Prim server instantiates", () => {
	// use case: to respond to client app (most common)
	test("with local module", () => {
		const prim = createPrimServer({ module })
		expect(typeof prim.server().call === "function").toBeTruthy()
	})
	test("with remote module", () => {
		// NOTE: this test isn't useful yet (need to find a way to test remote module here or remove test)
		const prim = createPrimServer<IModule>()
		expect(typeof prim.server().call === "function").toBeTruthy()
	})
})

describe("Prim Server can call methods with local module", () => {
	const prim = createPrimServer({ module, prefix: "/prim" })
	test("using a URL", async () => {
		const server = prim.server()
		const url = queryString.stringifyUrl({
			url: "/prim/sayHello",
			query: { greeting: "Salut", name: "Ted" },
		})
		const response = await server.call({ method: "GET", url })
		const result = JSON.parse(response.body) as RpcAnswer
		expect(result).toEqual({ result: "Salut Ted!" })
	})
	test("using a JSON body", async () => {
		const server = prim.server()
		const call: RpcCall = {
			method: "sayHello",
			params: { greeting: "Hola", name: "Ted" },
			id: 1,
		}
		const body = JSON.stringify(call)
		const response = await server.call({ method: "POST", body })
		const result = JSON.parse(response.body) as RpcAnswer
		expect(result).toEqual({ result: "Hola Ted!", id: 1 })
	})
})

test("Prim Server can call remote methods (without module directly)", async () => {
	const { client, socket, callbackHandler, methodHandler } = createPrimTestingPlugins()
	createPrimServer({ module, callbackHandler, methodHandler }) // server 1
	const prim = createPrimServer<IModule>({ client, socket }) // server 2
	const server = prim.server()
	const call: RpcCall = {
		method: "sayHello",
		params: { greeting: "Hellooo", name: "Ted" },
		id: 1,
	}
	const body = JSON.stringify(call)
	const response = await server.call({ method: "POST", body })
	const result = JSON.parse(response.body) as RpcAnswer
	expect(result).toEqual({ result: "Hellooo Ted!", id: 1 })
})

describe("Prim Server can understand its given context", () => {
	const prim = createPrimServer({ module, prefix: "/prim" })
	test("using a JSON body", async () => {
		const server = prim.server()
		const call: RpcCall = { method: "whatIsThis", id: 1 }
		const body = JSON.stringify(call)
		const response = await server.call({ method: "POST", body }, undefined, { context: "ted" })
		const result = JSON.parse(response.body) as RpcAnswer
		expect(result).toEqual({ result: { this: true }, id: 1 })
	})
})

// describe("Prim Server can answer batch calls", () => {
// 	// NOTE: this could possibly be moved to the client since the client tests also test the Prim Server
// })

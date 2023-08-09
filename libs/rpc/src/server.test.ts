// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/unbound-method -- Test the unexpected */

import { describe, test, expect } from "vitest"
import { createPrimServer } from "."
import { PrimServerActionsExtended, RpcAnswer, RpcCall } from "./interfaces"
import type * as exampleClient from "@doseofted/prim-example"
import * as exampleServer from "@doseofted/prim-example"
import queryString from "query-string"
import { createPrimTestingPlugins } from "./testing"
import justSafeGet from "just-safe-get"

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
			args: { greeting: "Hola", name: "Ted" },
			id: 1,
		}
		const body = JSON.stringify(call)
		const response = await server.call({ method: "POST", body })
		const result = JSON.parse(response.body) as RpcAnswer
		expect(result).toEqual({ result: "Hola Ted!", id: 1 })
	})
})

describe("Prim Server can call methods with dynamically imported module", () => {
	test("dynamic import only", async () => {
		const prim = createPrimServer({ module: import("@doseofted/prim-example"), prefix: "/prim" })
		const server = prim.server()
		const url = queryString.stringifyUrl({
			url: "/prim/sayHello",
			query: { greeting: "Salut", name: "Ted" },
		})
		const response = await server.call({ method: "GET", url })
		const result = JSON.parse(response.body) as RpcAnswer
		expect(result).toEqual({ result: "Salut Ted!" })
	})
	test("function that returns a dynamic import", async () => {
		const prim = createPrimServer({ module: () => import("@doseofted/prim-example"), prefix: "/prim" })
		const server = prim.server()
		const call: RpcCall = {
			method: "sayHello",
			args: { greeting: "Hola", name: "Ted" },
			id: 1,
		}
		const body = JSON.stringify(call)
		const response = await server.call({ method: "POST", body })
		const result = JSON.parse(response.body) as RpcAnswer
		expect(result).toEqual({ result: "Hola Ted!", id: 1 })
	})
})

/** Utility to make sending POST-like requests easier for tests */
async function handlePost(server: PrimServerActionsExtended, call: RpcCall): Promise<RpcAnswer> {
	const body = JSON.stringify(call)
	const response = await server.call({ method: "POST", body })
	const result = JSON.parse(response.body) as RpcAnswer
	return result
}

describe("Prim Server cannot call non-RPC", () => {
	// function prepareCall (given: RpcCall) {
	// 	const body = JSON.stringify(given)
	// 	return { method: "POST", body }
	// }
	test("with exported object", async () => {
		const prim = createPrimServer({ module, prefix: "/prim" })
		const server = prim.server()
		const result = await handlePost(server, {
			method: "superSecret",
			id: 1,
		})
		const notExpected = module.superSecret
		expect(result).not.toEqual({ result: notExpected, id: 1 })
		expect(result).toEqual({ error: "Method was not callable", id: 1 })
	})
	test("with local import", async () => {
		const prim = createPrimServer({ module, prefix: "/prim" })
		const server = prim.server()
		const result = await handlePost(server, {
			method: "definitelyNotRpc",
			id: 1,
		})
		const expected = module.definitelyNotRpc()
		expect(result).not.toEqual({ result: expected, id: 1 })
		expect(result).toEqual({ error: "Method was not allowed", id: 1 })
	})
	test("with dynamic import", async () => {
		const prim = createPrimServer({ module: import("@doseofted/prim-example"), prefix: "/prim" })
		const server = prim.server()
		const result = await handlePost(server, {
			method: "definitelyNotRpc",
			id: 1,
		})
		const expected = module.definitelyNotRpc()
		expect(result).not.toEqual({ result: expected, id: 1 })
		expect(result).toEqual({ error: "Method was not allowed", id: 1 })
	})
	test("with dynamic import inside of static import", async () => {
		const prim = createPrimServer({ module, prefix: "/prim" })
		const server = prim.server()
		const result = await handlePost(server, {
			method: "dynamic/synergy",
			id: 1,
		})
		const dynamicResolved = await module.dynamic
		const notExpected = dynamicResolved.synergy()
		expect(result).not.toEqual({ result: notExpected, id: 1 })
		// NOTE: method is not found because it's in a promise
		expect(result).toEqual({ error: "Method was not found", id: 1 })
	})
	test("with method on method that's not allowed", async () => {
		const prim = createPrimServer({ module: import("@doseofted/prim-example"), prefix: "/prim" })
		const server = prim.server()
		const result = await handlePost(server, {
			method: "greetings/toString",
			id: 1,
		})
		const notExpected = module.greetings.toString()
		expect(result).not.toEqual({ result: notExpected, id: 1 })
		expect(result).toEqual({ error: "Method was not valid", id: 1 })
	})
	test("property retrieval works as expected", () => {
		// "just-safe-get" will not expand "." in if given `string[]` but will when given `string`
		// This test is just to ensure a future upgrade doesn't change that
		const testing = { abc: () => 123 }
		const toStringFunc = testing.abc.toString
		const retrievedPropFromString = justSafeGet(testing, "abc.toString") as () => string
		const retrievedPropFromArray = justSafeGet(testing, "abc.toString".split("/")) as undefined
		expect(retrievedPropFromString).toEqual(toStringFunc)
		expect(retrievedPropFromString).toBeTypeOf("function")
		expect(retrievedPropFromArray).not.toEqual(toStringFunc)
		expect(retrievedPropFromArray).toBeTypeOf("undefined")
	})
})

test("Prim Server can call remote methods (without module directly)", async () => {
	const { callbackPlugin, methodPlugin, callbackHandler, methodHandler } = createPrimTestingPlugins()
	createPrimServer({ module, callbackHandler, methodHandler }) // server 1
	const prim = createPrimServer<IModule>({ callbackPlugin, methodPlugin }) // server 2
	const server = prim.server()
	const call: RpcCall = {
		method: "sayHello",
		args: { greeting: "Hellooo", name: "Ted" },
		id: 1,
	}
	const body = JSON.stringify(call)
	const response = await server.call({ method: "POST", body })
	const result = JSON.parse(response.body) as RpcAnswer
	expect(result).toEqual({ result: "Hellooo Ted!", id: 1 })
})

describe("Prim Server can handle invalid requests", () => {
	const { callbackHandler, methodHandler } = createPrimTestingPlugins()
	const prim = createPrimServer({ module, callbackHandler, methodHandler })

	test("with no method name", async () => {
		const server = prim.server()
		const call: RpcCall = {
			method: "",
			id: 1,
		}
		const body = JSON.stringify(call)
		const response = await server.call({ method: "POST", body })
		const result = JSON.parse(response.body) as RpcAnswer
		expect(result).toEqual({ error: "Invalid method name", id: 1 })
	})
	test("with invalid JSON body", async () => {
		const server = prim.server()
		const body = '{ "method": "sayHello", "id": 1 ]'
		const response = await server.call({ method: "POST", body })
		const result = JSON.parse(response.body) as RpcAnswer
		// thrown unknown error because container request was invalid
		expect(result).toEqual({ error: "Unknown RPC error" })
	})
	// TODO: "Invalid method name" may not be the correct error (this may be related to testing plugin, need to check)
	// test("with wrong HTTP method and body/url given (GET)", async () => {
	// 	const server = prim.server()
	// 	const call: RpcCall = {
	// 		method: "greetings",
	// 		id: 1,
	// 	}
	// 	const body = JSON.stringify(call)
	// 	const response = await server.call({ method: "GET", body })
	// 	const result = JSON.parse(response.body) as RpcAnswer
	// 	expect(result).toEqual({ error: "Invalid method name" })
	// })
	// test("with wrong HTTP method and body/url given (POST)", async () => {
	// 	const server = prim.server()
	// 	const url = queryString.stringifyUrl({
	// 		url: "/greetings",
	// 		query: { greeting: "Howdy", name: "Ted" },
	// 	})
	// 	const response = await server.call({ method: "POST", url })
	// 	const result = JSON.parse(response.body) as RpcAnswer
	// 	expect(result).toEqual({ error: "Invalid method name" })
	// })
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

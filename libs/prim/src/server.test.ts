import { describe, test, expect } from "vitest"
import { createPrimServer } from "."
import type * as exampleClient from "@doseofted/prim-example"
import * as exampleServer from "@doseofted/prim-example"

const module = exampleServer
type IModule = typeof exampleClient

describe("Prim server instantiates", () => {
	// use case: to respond to client app (most common)
	test("with local module", () => {
		const prim = createPrimServer({ module })
		expect(typeof prim().call === "function").toBeTruthy()
	})
	// use case: to chain multiple Prim servers together (TODO feature itself not implemented yet)
	test("with remote module", () => {
		const prim = createPrimServer<IModule>()
		expect(typeof prim().call === "function").toBeTruthy()
	})
})

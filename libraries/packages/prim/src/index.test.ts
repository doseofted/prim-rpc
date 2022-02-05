import { createPrim, RpcError } from "./index"
import type * as example from "example"
import * as exampleReal from "example"


test("positional args work", async () => {
	const primmed = createPrim <typeof example>({
		client: (body) => new Promise((r) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			r({ result: body.params as any })
		})
	})
	let greeting: string
	const args = ["Yo", "Ted"]
	try {
		greeting = await primmed("sayHelloAlternative", ...args)
	} catch (error) {
		if (error instanceof RpcError) {
			console.log(error.message)
		}
	}
	expect(greeting).toEqual(args)
})

test("objects args work", async () => {
	const primmed = createPrim<typeof example>({
		client: (body) => new Promise((r) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			r({ result: body.params as any })
		})
	})
	let greeting: string
	const response = { greeting: "Yo", name: "Ted" }
	try {
		greeting = await primmed("sayHello", { greeting: "Yo", name: "Ted" })
	} catch (error) {
		if (error instanceof RpcError) {
			console.log(error.message)
		}
	}
	expect(greeting).toEqual(response)
})

test("server-mode answers function", async () => {
	const primmed = createPrim({ server: true }, exampleReal)
	let greeting: string
	const response = "Yo Ted!"
	try {
		greeting = await primmed("sayHello", { greeting: "Yo", name: "Ted" })
	} catch (error) {
		if (error instanceof RpcError) {
			console.log(error.message)
		}
	}
	expect(greeting).toEqual(response)
})

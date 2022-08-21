import { test, expect } from "vitest"
// import { createPrimClient, createPrimServer } from "."
// import type * as exampleClient from "@doseofted/prim-example"
// import * as exampleServer from "@doseofted/prim-example"
// import type { PrimClientFunction, PrimServerActionsExtended, RpcAnswer, RpcCall } from "./interfaces"
// import jsonHandler from "superjson"

// const module = exampleServer
// type IModule = typeof exampleClient

test("dummy", () => expect(1).toBe(1))

// TODO: move tests to their own files where it makes sense
// for instance, functions in options.ts would be defined in options.test.ts

// // TODO: write test for batch calls over HTTP
// describe("Prim can batch requests", () => {
// 	test("server can handle batch requests", async () => {
// 		const prim = createPrimServer({ module })
// 		const answers = await prim.rpc({
// 			body: [
// 				{
// 					id: 1,
// 					method: "testLevel2/testLevel1/sayHello",
// 					params: { greeting: "Hey", name: "Ted" },
// 				},
// 				{
// 					id: 2,
// 					method: "testLevel2/testLevel1/sayHello",
// 					params: { greeting: "Hi", name: "Ted" },
// 				},
// 			],
// 		})
// 		const sorted = (answers as RpcAnswer[]).sort((a, b) => (a.id && b.id && a.id < b.id) ? -1 : 1)
// 		expect(sorted).toEqual([
// 			{ result: "Hey Ted!", id: 1 },
// 			{ result: "Hi Ted!", id: 2 },
// 		])
// 	})
// 	test("client understands responses from batch request", async () => {
// 		const prim = createPrimServer({ module })
// 		const { sayHello, sayHelloAlternative } = createPrimClient<IModule>({
// 			client: async (_endpoint, body) => prim.rpc({ body }),
// 			clientBatchTime: 300, // NOTE test result will take slightly longer than 300ms (only for test, usually <15ms)
// 		})
// 		const expected = [
// 			exampleServer.sayHello({ greeting: "Hey", name: "Ted" }),
// 			exampleServer.sayHelloAlternative("Hey", "Ted"),
// 		]
// 		const results = [
// 			sayHello({ greeting: "Hey", name: "Ted" }),
// 			sayHelloAlternative("Hey", "Ted"),
// 		]
// 		await expect(Promise.all(results)).resolves.toEqual(await Promise.all(expected))
// 	})
// })

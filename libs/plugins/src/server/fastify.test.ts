import { describe, test, beforeEach, afterEach, expect } from "vitest"
import request from "superwstest"
import * as module from "@doseofted/prim-example"
import Fastify from "fastify"
import { createPrimServer } from "@doseofted/prim-rpc"
import { fastifyPrimPlugin, primMethodFastify } from "./fastify"

describe("Fastify plugin is functional as Prim Plugin", () => {
	const fastify = Fastify()
	createPrimServer({
		module,
		methodHandler: primMethodFastify({ fastify }),
	})
	beforeEach(async () => {
		await fastify.ready()
		await new Promise(resolve => {
			fastify.server.listen(0, "localhost", () => { resolve(true) })
		})
	})
	afterEach(() => { fastify.server.close() })
	const params = { greeting: "What's up", name: "Ted" }
	const expected = { id: 1, result: module.sayHello(params) }
	test("registered as Prim Plugin", async () => {
		const response = await request(fastify.server)
			.post("/prim")
			.send({
				id: 1,
				method: "sayHello",
				params,
			})
			.set("accept", "application/json")
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expected)
	})
})

describe("Fastify plugin is functional as Fastify plugin", async () => {
	const prim = createPrimServer({
		module,
	})
	const fastify = Fastify()
	await fastify.register(fastifyPrimPlugin, { prim })
	beforeEach(async () => {
		await fastify.ready()
		await new Promise(resolve => {
			fastify.server.listen(0, "localhost", () => { resolve(true) })
		})
	})
	afterEach(() => { fastify.server.close() })
	const params = { greeting: "What's up", name: "Ted" }
	const expected = { id: 1, result: module.sayHello(params) }
	test("registered as Fastify Plugin", async () => {
		const response = await request(fastify.server)
			.post("/prim")
			.send({
				id: 1,
				method: "sayHello",
				params,
			})
			.set("accept", "application/json")
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expected)
	})
})

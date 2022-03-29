import request from "supertest"
import example from "example"
import { createPrimServer } from "prim"
import { primExpressMiddleware, primFasifyPlugin } from "."
import express from "express"
import Fastify from "fastify"

describe("Server plugins are functional", () => {
	const prefix = "/prim"
	const jsonType = "application/json"
	const requestToMake = {
		id: 1,
		method: "sayHello",
		params: { greeting: "Hey", name: "Ted" }
	}
	const expectedResult = { result: "Hey Ted!", id: 1 }
	it("should work with Fastify", async () => {
		const prim = createPrimServer(example)
		const fastify = Fastify()
		fastify.register(primFasifyPlugin, { prim })
		await fastify.ready()
		const response = await request(fastify.server)
			.post(prefix)
			.send(requestToMake)
			.set("Accept", jsonType)
		// expect(response.headers["Content-Type"]).toBe(jsonType)
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expectedResult)
	})
	it("should work with Express", async () => {
		const prim = createPrimServer(example)
		const app = express()
		app.use(express.json())
		app.use(primExpressMiddleware(prim, prefix))
		const response = await request(app)
			.post(prefix)
			.send({
				id: 1,
				method: "sayHello",
				params: { greeting: "Hey", name: "Ted" }
			})
			.set("Accept", "application/json")
		// expect(response.headers["Content-Type"]).toBe(prefix)
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expectedResult)
	})
})

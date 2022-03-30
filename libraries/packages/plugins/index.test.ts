import request from "supertest"
import wsRequest from "superwstest"
import { createServer } from "http"
import type { Server as HttpServer } from "http"

import example from "example"
import { createPrimServer } from "prim"
import { primExpressMiddleware, primFasifyPlugin, primWebSocketServerSetup } from "."
import express from "express"
import Fastify from "fastify"
import type { FastifyServerFactory } from "fastify"

import { WebSocketServer } from "ws"

describe("Fastify plugin is functional", () => {
	const prim = createPrimServer(example)
	let server: HttpServer
	const serverFactory: FastifyServerFactory = (handler) => {
		server = createServer((req, res) => { handler(req, res) })
		return server
	}
	const fastify = Fastify({ serverFactory })
	fastify.register(primFasifyPlugin, { prim })
	beforeEach((done) => { server.listen(0, "localhost", done) })
	afterEach((done) => { server.close(done) })
	it("should make request over HTTP", async () => {
		await fastify.ready()
		const response = await request(server)
			.post("/prim")
			.send({
				id: 1,
				method: "sayHello",
				params: { greeting: "Hey", name: "Ted" }
			})
			.set("Accept", "application/json")
		// expect(response.headers["Content-Type"]).toBe(jsonType)
		expect(response.status).toEqual(200)
		expect(response.body).toEqual({ result: "Hey Ted!", id: 1 })
	})
	// it("should work with WS", async () => {
	// 	await fastify.ready()
	// 	const websocket = new WebSocketServer({ server })
	// 	primWebSocketServerSetup(prim, websocket)
	// 	const callbackId = "_cb_Uakgb_J5m9g-0JDMbcJqL"
	// 	await wsRequest(server)
	// 		.ws("/prim")
	// 		.expectJson({ id: callbackId, result: "H" })
	// 		// .expectJson({ id: callbackId, result: "e" })
	// 		// .expectJson({ id: callbackId, result: "y" })
	// 		.close()
	// 		.expectClosed()
	// 	websocket.on("connection", (ws) => ws.on("message", (m) => console.log(m)))
	// 	const response = await request(fastify.server)
	// 		.post("/prim")
	// 		.send({
	// 			id: 1,
	// 			method: "typeMessage",
	// 			params: ["Hey", callbackId, 300]
	// 		})
	// 		.set("Accept", "application/json")
	// 	// expect(response.headers["Content-Type"]).toBe(jsonType)
	// 	expect(response.status).toEqual(200)
	// 	expect(response.body).toEqual({ id: 1 })
	// })
})

describe("Express plugin is functional", () => {
	const expectedResult = { result: "Hey Ted!", id: 1 }
	it("should make request over HTTP", async () => {
		const prim = createPrimServer(example)
		const app = express()
		app.use(express.json())
		app.use(primExpressMiddleware(prim, "/prim"))
		const response = await request(app)
			.post("/prim")
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

import wsRequest from "superwstest"
import example from "@doseofted/prim-example"
import { createPrimServer } from "@doseofted/prim-rpc"
import { primExpressMiddleware, primFastifyPlugin, primWebSocketServerSetup } from "."
import express from "express"
import Fastify from "fastify"
import { WebSocketServer } from "ws"
import type { Server } from "http"

// TODO: move tests to their own files where it makes sense
// for instance, functions in client.ts would be defined in client.test.ts

describe("Fastify plugin is functional", () => {
	const prim = createPrimServer(example)
	const app = Fastify()
	void app.register(primFastifyPlugin, { prim, prefix: "/prim" })
	const server = app.server
	const websocket = new WebSocketServer({ server })
	primWebSocketServerSetup(prim, websocket)
	beforeEach(async () => {
		await app.ready()
		await new Promise(resolve => {
			server.listen(0, "localhost", () => { resolve(true) })
		})
	})
	afterEach((done) => {
		server.close(done)
	})
	const expectedResult = { result: "Hey Ted!", id: 1 }
	it("should make request over HTTP", async () => {
		const response = await wsRequest(app.server)
			.post("/prim")
			.send({
				id: 1,
				method: "sayHello",
				params: { greeting: "Hey", name: "Ted" },
			})
			.set("Accept", "application/json")
		// expect(response.headers["Content-Type"]).toBe(prefix)
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expectedResult)
	})
	/* it("should work with WS", async () => {
		const callbackId = "_cb_Uakgb_J5m9g-0JDMbcJqL"
		// websocket.on("connection", (ws) => ws.on("message", (m) => console.log(m)))
		const response = await wsRequest(server)
			.post("/prim")
			.send({
				id: 1,
				method: "typeMessage",
				params: ["Hey", callbackId, 300]
			})
			.set("Accept", "application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual({ id: 1 })
		wsRequest(server)
			.ws("/prim")
			.sendJson({
				id: 1,
				method: "typeMessage",
				params: ["Hey", callbackId, 300]
			})
			.expectJson({ id: callbackId, result: "H" })
			.expectJson({ id: callbackId, result: "e" })
			.expectJson({ id: callbackId, result: "y" })
			.close()
			.expectClosed()
	}) */
})

describe("Express plugin is functional", () => {
	const expectedResult = { result: "Hey Ted!", id: 1 }
	const prim = createPrimServer(example)
	const app = express()
	app.use(express.json())
	app.use(primExpressMiddleware(prim, "/prim"))
	let server: Server
	beforeEach((done) => {
		server = app.listen(0, "localhost", done)
	})
	afterEach((done) => {
		server.close(done)
	})
	it("should make request over HTTP", async () => {
		const response = await wsRequest(server)
			.post("/prim")
			.send({
				id: 1,
				method: "sayHello",
				params: { greeting: "Hey", name: "Ted" },
			})
			.set("Accept", "application/json")
		// expect(response.headers["Content-Type"]).toBe(prefix)
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expectedResult)
	})
})

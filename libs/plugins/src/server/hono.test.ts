// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { describe, test, beforeEach, afterEach, expect } from "vitest"
import request from "superwstest"
import * as module from "@doseofted/prim-example"
import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { createPrimServer } from "@doseofted/prim-rpc"
import { createMethodHandler, honoPrimRpc } from "./hono"
import queryString from "query-string"
import type { Server } from "node:http"
import FormData from "form-data"
import { Blob, File } from "node:buffer"

describe("Hono plugin is functional as Prim Plugin", () => {
	const app = new Hono()
	createPrimServer({ module, methodHandler: createMethodHandler({ app }) })
	let server: Server
	beforeEach(async () => {
		server = serve({ fetch: app.fetch, port: 0 })
		const listening = new Promise(resolve => {
			server.addListener("listening", resolve)
		})
		server.listen()
		await listening
	})
	afterEach(async () => {
		await new Promise(resolve => server?.close(resolve))
	})
	const args = { greeting: "What's up", name: "Ted" }
	const expected = { id: 1, result: module.sayHello(args) }
	test("registered as Prim Plugin", async () => {
		const response = await request(server)
			.post("/prim/sayHello")
			.send({
				method: "sayHello",
				args,
				id: 1,
			})
			.set("accept", "application/json")
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expected)
	})
})

describe("Hono plugin is functional as Hono middleware", () => {
	const app = new Hono()
	const methodHandler = createMethodHandler({ app })
	const prim = createPrimServer({ module, methodHandler })
	app.use("/prim", honoPrimRpc({ prim }))
	let server: Server
	beforeEach(async () => {
		server = serve({ fetch: app.fetch, port: 0 })
		const listening = new Promise(resolve => {
			server.addListener("listening", resolve)
		})
		server.listen()
		await listening
	})
	afterEach(async () => {
		await new Promise(resolve => server?.close(resolve))
	})
	const args = { greeting: "What's up", name: "Ted" }
	const expected = { id: 1, result: module.sayHello(args) }
	test("registered as Hono Plugin", async () => {
		const response = await request(server)
			.post("/prim")
			.send({
				method: "sayHello",
				args,
				id: 1,
			})
			.set("accept", "application/json")
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expected)
	})
})

describe("Hono middleware works with over GET/POST", () => {
	const app = new Hono()
	createPrimServer({ module, methodHandler: createMethodHandler({ app }) })
	let server: Server
	beforeEach(async () => {
		server = serve({ fetch: app.fetch, port: 0 })
		const listening = new Promise(resolve => {
			server.addListener("listening", resolve)
		})
		server.listen()
		await listening
	})
	afterEach(async () => {
		await new Promise(resolve => server?.close(resolve))
	})
	const args = { greeting: "What's up", name: "Ted" }
	const expected = { id: 1, result: module.sayHello(args) }
	test("POST requests", async () => {
		const response = await request(server)
			.post("/prim")
			.send({
				method: "sayHello",
				args,
				id: 1,
			})
			.set("accept", "application/json")
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expected)
	})
	test("GET requests", async () => {
		const url = queryString.stringifyUrl({
			url: "/prim/sayHello",
			query: { ...args, "-": 1 },
		})
		const response = await request(server).get(url).send().set("accept", "application/json")
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expected)
	})
})

describe("Hono middleware can support files", async () => {
	const app = new Hono()
	createPrimServer({ module, methodHandler: createMethodHandler({ app }) })
	let server: Server
	beforeEach(async () => {
		server = serve({ fetch: app.fetch, port: 0 })
		const listening = new Promise(resolve => {
			server.addListener("listening", resolve)
		})
		server.listen()
		await listening
	})
	afterEach(async () => {
		await new Promise(resolve => server?.close(resolve))
	})
	const formData = new FormData()
	formData.append(
		"rpc",
		JSON.stringify({
			method: "uploadTheThing",
			args: ["_bin_cool"],
			id: 1,
		})
	)
	const fileName = "hi.txt"
	const fileContents = new Blob(["hello"], { type: "text/plain" })
	const file = new File([fileContents], fileName)
	formData.append("_bin_cool", await fileContents.text(), fileName)
	const expected = { id: 1, result: module.uploadTheThing(file) }
	test("given a text file", async () => {
		const response = await request(server)
			.post("/prim")
			.send(formData.getBuffer())
			.set("content-type", `multipart/form-data; boundary=${formData.getBoundary()}`)
			.set("accept", "application/json")
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expected)
	})
})

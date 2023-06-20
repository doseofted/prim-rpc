// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { describe, test, beforeEach, afterEach, expect } from "vitest"
import request from "superwstest"
import * as module from "@doseofted/prim-example"
import express from "express"
import multipartPlugin from "multer"
import { createPrimServer } from "@doseofted/prim-rpc"
import { createMethodHandler, expressPrimRpc } from "./express"
import queryString from "query-string"
import FormData from "form-data"
import type { Server } from "node:http"
import { Blob, File } from "node:buffer"

describe("Express plugin is functional as Prim Plugin", () => {
	const app = express()
	createPrimServer({
		module,
		methodHandler: createMethodHandler({ app }),
	})
	let server: Server
	beforeEach(async () => {
		await new Promise<void>(resolve => {
			const done = () => resolve()
			server = app.listen(0, "localhost", done)
		})
	})
	afterEach(() => {
		server?.close()
	})
	const args = { greeting: "What's up", name: "Ted" }
	const expected = { id: 1, result: module.sayHello(args) }
	test("registered as Prim Plugin", async () => {
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

describe("Express plugin is functional as Express plugin", () => {
	const prim = createPrimServer({
		module,
	})
	const app = express()
	app.use(expressPrimRpc({ prim }))
	let server: Server
	beforeEach(async () => {
		await new Promise<void>(resolve => {
			const done = () => resolve()
			server = app.listen(0, "localhost", done)
		})
	})
	afterEach(() => {
		server?.close()
	})
	const args = { greeting: "What's up", name: "Ted" }
	const expected = { id: 1, result: module.sayHello(args) }
	test("registered as Express middleware", async () => {
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

describe("Express middleware works with over GET/POST", () => {
	const prim = createPrimServer({
		module,
	})
	const app = express()
	app.use(expressPrimRpc({ prim }))
	let server: Server
	beforeEach(async () => {
		await new Promise<void>(resolve => {
			const done = () => resolve()
			server = app.listen(0, "localhost", done)
		})
	})
	afterEach(() => {
		server?.close()
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

describe("Express middleware can support files", async () => {
	const prim = createPrimServer({
		module,
		showErrorStack: true,
	})
	const app = express()
	app.use(expressPrimRpc({ prim, multipartPlugin }))
	let server: Server
	beforeEach(async () => {
		await new Promise<void>(resolve => {
			const done = () => resolve()
			server = app.listen(0, "localhost", done)
		})
	})
	afterEach(() => {
		server?.close()
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

// Part of the Prim+RPC project ( https://prim.doseofted.com/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { describe, test, beforeEach, afterEach, expect } from "vitest"
import request from "superwstest"
import * as module from "@doseofted/prim-example"
import express from "express"
import { createPrimServer } from "@doseofted/prim-rpc"
import { createMethodHandler, expressPrimRpc } from "./express"
import type { Server } from "node:http"

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

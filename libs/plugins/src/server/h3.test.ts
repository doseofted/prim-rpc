// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-unsafe-member-access -- `request` doesn't have full type definitions */

import { describe, test, beforeEach, expect } from "vitest"
import request from "superwstest"
import * as module from "@doseofted/prim-example"
import { RpcAnswer, createPrimServer } from "@doseofted/prim-rpc"
import { createMethodHandler, defineH3PrimHandler } from "./h3"
import { createApp, toNodeListener } from "h3"
import { createServer } from "node:http"
import queryString from "query-string"
import FormData from "form-data"
import { Blob, File } from "node:buffer"
import { readFileSync } from "node:fs"

describe("H3 plugin is functional as Prim Plugin", () => {
	const app = createApp()
	const server = createServer(toNodeListener(app))
	const methodHandler = createMethodHandler({ app })
	createPrimServer({ module, methodHandler })
	beforeEach(() => {
		server.listen(0)
		return () => server.close()
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
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expected)
	})
})

describe("H3 plugin is functional as H3 middleware", () => {
	const app = createApp()
	const server = createServer(toNodeListener(app))
	const prim = createPrimServer({ module })
	const primHandler = defineH3PrimHandler({ prim })
	app.use(primHandler)
	beforeEach(() => {
		server.listen(0)
		return () => server.close()
	})
	const args = { greeting: "What's up", name: "Ted" }
	const expected = { id: 1, result: module.sayHello(args) }
	test("registered as Fastify Plugin", async () => {
		const response = await request(server)
			.post("/prim")
			.send({
				method: "sayHello",
				args,
				id: 1,
			})
			.set("accept", "application/json")
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expected)
	})
})

describe("H3 plugin works with over GET/POST", () => {
	const app = createApp()
	const server = createServer(toNodeListener(app))
	const methodHandler = createMethodHandler({ app })
	createPrimServer({ module, methodHandler })
	beforeEach(() => {
		server.listen(0)
		return () => server.close()
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
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expected)
	})
})

describe("H3 plugin can support binary data", () => {
	const app = createApp()
	const server = createServer(toNodeListener(app))
	const methodHandler = createMethodHandler({ app, formDataHandler: FormData })
	createPrimServer({ module, methodHandler })
	beforeEach(() => {
		server.listen(0)
		return () => server.close()
	})

	test("upload a file", async () => {
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
		const response = await request(server)
			.post("/prim")
			.send(formData.getBuffer())
			.set("content-type", `multipart/form-data; boundary=${formData.getBoundary()}`)
			.set("accept", "application/json")
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expected)
	})

	test("download a file over POST", async () => {
		const response = await request(server)
			.post("/prim")
			.send({
				method: "makeItATextFile",
				args: "Hello!",
				id: 1,
			})
			.set("content-type", "application/json")
			.set("accept", "multipart/form-data")
		expect(response.headers["content-type"]).toContain("multipart/form-data")
		const resultRpc = (
			typeof response.body === "object" && "rpc" in response.body ? JSON.parse(response.body.rpc as string) : null
		) as RpcAnswer | null
		expect(resultRpc).not.toBeNull()
		const binaryIdentifier = typeof resultRpc?.result === "string" ? resultRpc.result : ""
		expect(binaryIdentifier.startsWith("_bin_")).toBe(true)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const fileGiven = response.files[binaryIdentifier]
		expect(fileGiven.originalFilename).toBe("text.txt")
		expect(fileGiven.mimetype).toBe("text/plain")
		const fileContents = readFileSync(fileGiven.filepath as string, { encoding: "utf-8" })
		expect(fileContents).toBe("Hello!")
		expect(response.status).toEqual(200)
	})

	test("download a file directly over GET", async () => {
		const response = await request(server)
			.get(
				queryString.stringifyUrl({
					url: "/prim/makeItATextFile",
					query: { "0": "Hello!", "-": 1 },
				})
			)
			.set("content-type", "application/json")
			.set("accept", "text/plain")
		expect(response.headers["content-type"]).toContain("text/plain")
		expect(response.headers["content-disposition"]).toContain(`filename="text.txt"`)
		expect(response.status).toEqual(200)
		expect(response.text).toBe("Hello!")
		// NOTE: if given file that wasn't text/plain, this would be a Buffer
		// expect(response.body).toBeInstanceOf(Buffer)
		// expect(response.body instanceof Buffer ? response.body.toString("utf-8") : "").toBe("Hello!")
	})
})

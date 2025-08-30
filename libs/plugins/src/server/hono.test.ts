// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-unsafe-member-access -- `request` doesn't have full type definitions */

import { describe, test, beforeEach, expect } from "vitest"
import request from "superwstest"
import * as module from "@doseofted/prim-example"
import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { JsonHandler, RpcAnswer, createPrimServer } from "@doseofted/prim-rpc"
import { createMethodHandler, honoPrimRpc } from "./hono"
import queryString from "query-string"
import FormData from "form-data"
import { Blob, File } from "node:buffer"
import { readFileSync } from "node:fs"
import superjson from "superjson"
import { encode as msgPack, decode as msgUnpack } from "@msgpack/msgpack"

describe("Hono plugin is functional as Prim Plugin", () => {
	const app = new Hono()
	createPrimServer({ module, methodHandler: createMethodHandler({ app }) })
	let server: ReturnType<typeof serve>
	beforeEach(async () => {
		server = serve({ fetch: app.fetch, port: 0 })
		const listening = new Promise(resolve => {
			server.addListener("listening", resolve)
		})
		server.listen()
		await listening
		return () => new Promise(resolve => server?.close(resolve))
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

describe("Hono plugin is functional as Hono middleware", () => {
	const app = new Hono()
	const methodHandler = createMethodHandler({ app })
	const prim = createPrimServer({ module, methodHandler })
	app.use("/prim", honoPrimRpc({ prim }))
	let server: ReturnType<typeof serve>
	beforeEach(async () => {
		server = serve({ fetch: app.fetch, port: 0 })
		const listening = new Promise(resolve => {
			server.addListener("listening", resolve)
		})
		server.listen()
		await listening
		return () => new Promise(resolve => server?.close(resolve))
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
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expected)
	})
})

describe("Hono middleware works with over GET/POST", () => {
	const app = new Hono()
	const methodHandler = createMethodHandler({ app })
	createPrimServer({ module, methodHandler })
	let server: ReturnType<typeof serve>
	beforeEach(async () => {
		server = serve({ fetch: app.fetch, port: 0 })
		const listening = new Promise(resolve => {
			server.addListener("listening", resolve)
		})
		server.listen()
		await listening
		return () => new Promise(resolve => server?.close(resolve))
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

describe("Hono middleware can support binary data", () => {
	const app = new Hono()
	createPrimServer({ module, methodHandler: createMethodHandler({ app }) })
	let server: ReturnType<typeof serve>
	beforeEach(async () => {
		server = serve({ fetch: app.fetch, port: 0 })
		const listening = new Promise(resolve => {
			server.addListener("listening", resolve)
		})
		server.listen()
		await listening
		return () => new Promise(resolve => server?.close(resolve))
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

const binaryJsonHandler: JsonHandler = {
	parse: msgUnpack,
	stringify: msgPack,
	binary: true,
	mediaType: "application/octet-stream",
}

describe("Hono middleware can support alternative JSON handler", () => {
	test("with string serialization", async () => {
		const app = new Hono()
		const methodHandler = createMethodHandler({ app })
		createPrimServer({ module, methodHandler, jsonHandler: superjson })
		const server = serve({ fetch: app.fetch, port: 0 })
		const listening = new Promise(resolve => {
			server.addListener("listening", resolve)
		})
		server.listen()
		await listening

		const today = new Date()
		const expected = module.whatIsDayAfter(today)
		const response = await request(server)
			.post("/prim")
			.send(
				superjson.serialize({
					method: "whatIsDayAfter",
					args: today,
					id: 1,
				})
			)
			.set("accept", "application/json")
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		const { result }: RpcAnswer = superjson.deserialize(response.body)
		expect(result).toBeInstanceOf(Date)
		expect(result.valueOf()).toEqual(expected.valueOf())

		await new Promise(resolve => server?.close(resolve))
	})

	test("with binary serialization", async () => {
		const app = new Hono()
		const methodHandler = createMethodHandler({ app })
		createPrimServer({ module, methodHandler, jsonHandler: binaryJsonHandler })
		const server = serve({ fetch: app.fetch, port: 0 })
		const listening = new Promise(resolve => {
			server.addListener("listening", resolve)
		})
		server.listen()
		await listening

		const today = new Date()
		const expected = module.whatIsDayAfter(today)
		const formData = new FormData()
		// Use Buffer directly with filename to make it treated as a file
		formData.append(
			"rpc",
			Buffer.from(
				msgPack({
					method: "whatIsDayAfter",
					args: today,
					id: 1,
				})
			),
			{
				filename: "rpc.bin",
				contentType: "application/octet-stream",
			}
		)
		const response = await request(server)
			.post("/prim")
			.send(formData.getBuffer())
			.set("content-type", `multipart/form-data; boundary=${formData.getBoundary()}`)
			.set("accept", "application/octet-stream")
		expect(response.headers["content-type"]).toContain("application/octet-stream")
		expect(response.status).toEqual(200)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		const { result }: RpcAnswer = msgUnpack(response.body)
		expect(result).toBeInstanceOf(Date)
		expect(result.valueOf()).toEqual(expected.valueOf())

		await new Promise(resolve => server?.close(resolve))
	})

	test("with binary serialization and file handling", async () => {
		const app = new Hono()
		const methodHandler = createMethodHandler({ app })
		createPrimServer({ module, methodHandler, jsonHandler: binaryJsonHandler })
		const server = serve({ fetch: app.fetch, port: 0 })
		const listening = new Promise(resolve => {
			server.addListener("listening", resolve)
		})
		server.listen()
		await listening

		const formData = new FormData()
		formData.append(
			"rpc",
			Buffer.from(
				msgPack({
					method: "uploadTheThing",
					args: ["_bin_cool"],
					id: 1,
				})
			),
			{
				filename: "rpc.bin",
				contentType: "application/octet-stream",
			}
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
			.set("accept", "application/octet-stream")
		expect(response.headers["content-type"]).toContain("application/octet-stream")
		expect(response.status).toEqual(200)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		const result = msgUnpack(response.body)
		expect(result).toEqual(expected)

		await new Promise(resolve => server?.close(resolve))
	})
})

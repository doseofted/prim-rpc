// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-unsafe-member-access -- `request` doesn't have full type definitions */

import { readFileSync } from "node:fs"
import { describe, test, beforeEach, afterEach, expect } from "vitest"
import request from "superwstest"
import * as module from "@doseofted/prim-example"
import Fastify, { type FastifyInstance } from "fastify"
import multipartPlugin from "@fastify/multipart"
import { RpcAnswer, createPrimServer } from "@doseofted/prim-rpc"
import { createMethodHandler, fastifyPrimRpc } from "./fastify"
import queryString from "query-string"
import FormData from "form-data"
import { Blob, File } from "node:buffer"

describe("Fastify plugin is functional as Prim Plugin", () => {
	let fastify: FastifyInstance
	beforeEach(async () => {
		fastify = Fastify()
		createPrimServer({
			module,
			methodHandler: createMethodHandler({ fastify }),
		})
		await fastify.ready()
		await fastify.listen({ port: 0, host: "localhost" })
	})
	afterEach(async () => {
		await fastify.close()
	})
	const args = { greeting: "What's up", name: "Ted" }
	const expected = { id: 1, result: module.sayHello(args) }
	test("registered as Prim Plugin", async () => {
		const response = await request(fastify.server)
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

describe("Fastify plugin is functional as Fastify plugin", () => {
	let fastify: FastifyInstance
	let prim: ReturnType<typeof createPrimServer>
	beforeEach(async () => {
		prim = createPrimServer({
			module,
		})
		fastify = Fastify()
		await fastify.register(fastifyPrimRpc, { prim })
		await fastify.ready()
		await fastify.listen({ port: 0, host: "localhost" })
	})
	afterEach(async () => {
		await fastify.close()
	})
	const args = { greeting: "What's up", name: "Ted" }
	const expected = { id: 1, result: module.sayHello(args) }
	test("registered as Fastify Plugin", async () => {
		const response = await request(fastify.server)
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

describe("Fastify plugin works with over GET/POST", () => {
	let fastify: FastifyInstance
	beforeEach(async () => {
		fastify = Fastify()
		createPrimServer({
			module,
			methodHandler: createMethodHandler({ fastify }),
		})
		await fastify.ready()
		await fastify.listen({ port: 0, host: "localhost" })
	})
	afterEach(async () => {
		await fastify.close()
	})
	const args = { greeting: "What's up", name: "Ted" }
	const expected = { id: 1, result: module.sayHello(args) }
	test("POST requests", async () => {
		const response = await request(fastify.server)
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
		const response = await request(fastify.server).get(url).send().set("accept", "application/json")
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expected)
	})
})

describe("Fastify plugin can support binary data", () => {
	let fastify: FastifyInstance
	beforeEach(async () => {
		fastify = Fastify()
		createPrimServer({
			module,
			methodHandler: createMethodHandler({ fastify, multipartPlugin, formDataHandler: FormData }),
		})
		await fastify.ready()
		await fastify.listen({ port: 0, host: "localhost" })
	})
	afterEach(async () => {
		await fastify.close()
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
		const response = await request(fastify.server)
			.post("/prim")
			.send(formData.getBuffer())
			.set("content-type", `multipart/form-data; boundary=${formData.getBoundary()}`)
			.set("accept", "application/json")
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expected)
	})

	test("download a file over POST", async () => {
		const response = await request(fastify.server)
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
		const response = await request(fastify.server)
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

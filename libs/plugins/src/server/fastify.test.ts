// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-unsafe-member-access -- `request` doesn't have full type definitions */

import { describe, test, beforeEach, afterEach, expect } from "vitest"
import request from "superwstest"
import * as module from "@doseofted/prim-example"
import Fastify from "fastify"
import multipartPlugin from "@fastify/multipart"
import { createPrimServer } from "@doseofted/prim-rpc"
import { createMethodHandler, fastifyPrimRpc } from "./fastify"
import queryString from "query-string"
import FormData from "form-data"
import { Blob, File } from "node:buffer"

describe("Fastify plugin is functional as Prim Plugin", () => {
	const fastify = Fastify()
	createPrimServer({
		module,
		methodHandler: createMethodHandler({ fastify }),
	})
	beforeEach(async () => {
		await fastify.ready()
		await new Promise(resolve => {
			fastify.server.listen(0, "localhost", () => {
				resolve(true)
			})
		})
	})
	afterEach(() => {
		fastify.server.close()
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

describe("Fastify plugin is functional as Fastify plugin", async () => {
	const prim = createPrimServer({
		module,
	})
	const fastify = Fastify()
	await fastify.register(fastifyPrimRpc, { prim })
	beforeEach(async () => {
		await fastify.ready()
		await new Promise(resolve => {
			fastify.server.listen(0, "localhost", () => {
				resolve(true)
			})
		})
	})
	afterEach(() => {
		fastify.server.close()
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
	const fastify = Fastify()
	createPrimServer({
		module,
		methodHandler: createMethodHandler({ fastify }),
	})
	beforeEach(async () => {
		await fastify.ready()
		await new Promise(resolve => {
			fastify.server.listen(0, "localhost", () => {
				resolve(true)
			})
		})
	})
	afterEach(() => {
		fastify.server.close()
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

describe("Fastify plugin can support files", async () => {
	const fastify = Fastify()
	createPrimServer({
		module,
		methodHandler: createMethodHandler({ fastify, multipartPlugin }),
	})
	beforeEach(async () => {
		await fastify.ready()
		await new Promise(resolve => {
			fastify.server.listen(0, "localhost", () => {
				resolve(true)
			})
		})
	})
	afterEach(() => {
		fastify.server.close()
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
	test("upload a file", async () => {
		const response = await request(fastify.server)
			.post("/prim")
			.send(formData.getBuffer())
			.set("content-type", `multipart/form-data; boundary=${formData.getBoundary()}`)
			.set("accept", "application/json")
		expect(response.headers["content-type"]).toContain("application/json")
		expect(response.status).toEqual(200)
		expect(response.body).toEqual(expected)
	})

	// test("download a file", async () => {
	// 	const response = await request(fastify.server)
	// 		.post("/prim")
	// 		.send({
	// 			method: "makeItATextFile",
	// 			args: "Hello!",
	// 			id: 1,
	// 		})
	// 		.set("accept", "application/json")
	// 	expect(response.headers["content-type"]).toContain("multipart/form-data")
	// 	expect(response.status).toEqual(200)
	// 	// expect(response.body).toEqual(expected)
	// })
})

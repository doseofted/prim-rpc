// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, beforeAll } from "vitest"
import * as module from "@doseofted/prim-example"
import Fastify from "fastify"
import multipartPlugin from "@fastify/multipart"
import { JsonHandler, createPrimClient, createPrimServer } from "@doseofted/prim-rpc"
import { createMethodHandler } from "../server/fastify"
import { createMethodPlugin } from "./browser-fetch"
import FormData from "form-data"
import { File } from "node:buffer"
import superjson from "superjson"
import { encode as msgPack, decode as msgUnpack } from "@msgpack/msgpack"

// TODO: instead of writing tests for each client plugin, consider extending tests from Prim RPC client tests

type IModule = typeof module
let endpoint = ""

beforeAll(async () => {
	const fastify = Fastify()
	const methodHandler = createMethodHandler({ fastify, multipartPlugin, formDataHandler: FormData })
	createPrimServer({ module, methodHandler, prefix: "/" })
	await fastify.ready()
	await new Promise<void>(resolve => {
		fastify.server.listen(0, "localhost", resolve)
	})
	const a = fastify.server.address()
	endpoint = typeof a === "string" ? a : `http://${a.family === "IPv6" ? `[${a.address}]` : a.address}:${a.port}`
	return () => fastify.server.close()
})

describe("Client can make requests", () => {
	test("successful, simple", async () => {
		const methodPlugin = createMethodPlugin()
		const client = createPrimClient<IModule>({ endpoint, methodPlugin })
		const args: Parameters<IModule["sayHelloAlternative"]> = ["Hi", "Ted"]
		const expected = module.sayHelloAlternative(...args)
		const result = await client.sayHelloAlternative(...args)
		expect(result).toBe(expected)
	})
})

describe("Client can handle binary data", () => {
	test("upload a file", async () => {
		const methodPlugin = createMethodPlugin()
		const client = createPrimClient<IModule>({ endpoint, methodPlugin })
		const args = [new File(["hello"], "hello.txt")] as const
		const expected = module.uploadTheThing(...args)
		const result = await client.uploadTheThing(...args)
		expect(result).toMatchObject(expected)
	})

	test("download a file", async () => {
		const methodPlugin = createMethodPlugin()
		const client = createPrimClient<IModule>({ endpoint, methodPlugin })
		const args = ["Hi Ted"] as const
		const expected = await module.makeItATextFile(...args)
		const result = await client.makeItATextFile(...args)
		expect(result).toBeInstanceOf(File)
		void expect(result.text()).resolves.toEqual(await expected.text())
	})
})

describe("Client can use alternative JSON handlers", () => {
	test.each<{ name: string; handler: JsonHandler }>([
		{
			name: "string (actual JSON)",
			handler: { stringify: superjson.stringify, parse: superjson.parse },
		},
		// FIXME: fix ability to use alternative JSON handler
		// {
		// 	name: "binary (not JSON)",
		// 	handler: {
		// 		stringify: msgPack,
		// 		parse: msgUnpack,
		// 		binary: true,
		// 		mediaType: "application/octet-stream",
		// 	},
		// },
	])("$name", async ({ handler: jsonHandler }) => {
		const fastify = Fastify()
		const methodHandler = createMethodHandler({ fastify, multipartPlugin, formDataHandler: FormData })
		createPrimServer({ module, jsonHandler, methodHandler, prefix: "/" })
		await fastify.ready()
		await new Promise<void>(resolve => {
			fastify.server.listen(0, "localhost", resolve)
		})
		const a = fastify.server.address()
		const endpoint =
			typeof a === "string" ? a : `http://${a.family === "IPv6" ? `[${a.address}]` : a.address}:${a.port}`

		const methodPlugin = createMethodPlugin()
		const client = createPrimClient<IModule>({ endpoint, methodPlugin, jsonHandler })
		const args = [new Date()] as const
		const expected = module.whatIsDayAfter(...args)
		const result = await client.whatIsDayAfter(...args)
		expect(result.valueOf()).toEqual(expected.valueOf())

		fastify.server.close()
	})
})

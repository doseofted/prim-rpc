// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { describe, test, beforeEach, afterEach } from "vitest"
import request from "superwstest"
import * as module from "@doseofted/prim-example"
import { createPrimServer } from "@doseofted/prim-rpc"
import { createCallbackHandler } from "./ws"
import { WebSocketServer } from "ws"
import http from "node:http"

describe("ws is functional as Prim Plugin", async () => {
	const server = http.createServer()
	const wss = new WebSocketServer({ server })
	createPrimServer({
		prefix: "/prim",
		module,
		callbackHandler: createCallbackHandler({ wss }),
	})
	beforeEach(async () => {
		await new Promise(resolve => {
			server.listen(0, "localhost", () => {
				resolve(true)
			})
		})
	})
	afterEach(() => {
		server.close()
	})
	const message = "Hey"
	const expected = await new Promise<string[]>(resolve => {
		const typed: string[] = []
		module.typeMessage(
			message,
			letter => {
				typed.push(letter)
				if (typed.length === message.length) {
					resolve(typed)
				}
			},
			0
		)
	})
	test("registered as Prim Plugin", async () => {
		const callbackId = "_cb_identifier"
		let response = request(server)
			.ws("/prim")
			.sendJson({
				method: "typeMessage",
				args: [message, callbackId, 0],
				id: 1,
			})
			.expectJson({ id: 1 })
		expected.forEach(letter => {
			response = response.expectJson({ id: callbackId, result: [letter] })
		})
		await response.close().expectClosed()
	})
})

// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { PrimServerCallbackHandler } from "@doseofted/prim-rpc"
import type { IncomingMessage } from "node:http"
import type { WebSocketServer } from "ws"

/** The default Prim context when used with WS. Overridden with `contextTransform` option. */
export type PrimWsContext = { context: "ws"; req: IncomingMessage }

interface MethodWsOptions {
	wss: WebSocketServer
	contextTransform?: (req: IncomingMessage) => unknown
}
/**
 * A Prim plugin used to register itself with the "ws" module. The callback handler plugin is often used in conjunction
 * wih a method handler plugin but you may also use it by itself if you only need to support WebSocket.
 */
export const createCallbackHandler = (options: MethodWsOptions): PrimServerCallbackHandler => {
	const { wss: webSocketServer, contextTransform = req => ({ context: "ws", req }) } = options
	return prim => {
		webSocketServer.on("connection", (ws, req) => {
			const context = contextTransform(req)
			const { ended, call } = prim.connected()
			ws.on("close", () => {
				ended()
			})
			ws.on("error", () => {
				ended()
			})
			ws.on("message", m => {
				call(
					String(m),
					data => {
						ws.send(data)
					},
					context
				)
			})
		})
	}
}

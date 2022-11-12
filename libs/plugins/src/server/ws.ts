import type { PrimServerCallbackHandler } from "@doseofted/prim-rpc"
import type { WebSocketServer } from "ws"

interface MethodWsOptions {
	wss: WebSocketServer
}
/**
 * A Prim plugin used to register itself with the "ws" module. The callback handler plugin is often used in conjunction
 * wih a method handler plugin but you may also use it by itself if you only need to support WebSocket.
 *
 * This first example shows how to use this plugin by itself without a method handler.
 *
 * ```ts
 * import { createPrimServer } from "@doseofted/prim-rpc"
 * import { primMethodWs } from "@doseofted/prim-plugins"
 *
 * const wss = new WebSocketServer({ port: 1234 })
 * const prim = createPrimServer({
 *   callbackHandler: primMethodWs({ wss })
 * })
 * ```
 *
 * This next example uses the "Fastify" method handler with this plugin but you may choose
 * any other method handler that you like. The method handler will be used first and once a callback is
 * given through Prim client only the callback handler will be used while connected.
 * Use like so:
 *
 * ```ts
 * import Fastify from "fastify"
 * import { WebSocketServer } from "ws"
 * import { createPrimServer } from "@doseofted/prim-rpc"
 * import { primMethodFastify, primMethodWs } from "@doseofted/prim-plugins"
 *
 * const fastify = Fastify()
 * const wss = new WebSocketServer({ server: fastify.server })
 * const prim = createPrimServer({
 *   methodHandler: primMethodFastify({ fastify }),
 *   callbackHandler: primMethodWs({ wss })
 * })
 * ```
 */
export const primCallbackWs = (options: MethodWsOptions): PrimServerCallbackHandler => {
	const { wss: webSocketServer } = options
	return prim => {
		webSocketServer.on("connection", ws => {
			const { ended, call } = prim.connected()
			ws.on("close", () => {
				ended()
			})
			ws.on("error", () => {
				ended()
			})
			ws.on("message", m => {
				call(String(m), data => {
					ws.send(data)
				})
			})
		})
	}
}

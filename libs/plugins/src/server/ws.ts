import type { PrimServerCallbackHandler } from "@doseofted/prim-rpc"
import type { WebSocketServer } from "ws"

// TODO: test this plugin

interface MethodWsOptions { wss: WebSocketServer }
/**
 * A Prim plugin used to register itself with the "ws" module. Note that the socket handler must be used in
 * conjunction wih a method handler. The example below uses the "Fastify" method handler but you may choose
 * any other method handler with this plugin. Use like so:
 * 
 * ```ts
 * import Fastify from "fastify"
 * import { createPrimServer } from "@doseofted/prim-rpc"
 * import { primMethodFastify, primMethodWs } from "@doseofted/prim-plugins"
 *
 * const fastify = Fastify()
 * const wss = new WebSocketServer({ server: fastify.server })
 * const prim = createPrimServer({
 *   methodHandler: primMethodFastify({ fastify }),
 *   socketHandler: primMethodWs({ wss })
 * })
 * ```
 */
export const primMethodWs = (options: MethodWsOptions): PrimServerCallbackHandler => {
	const { wss: webSocketServer } = options
	return prim => {
		webSocketServer.on("connection", (ws) => {
			const { ended, call } = prim.connected()
			ws.on("ended", () => { ended() })
			ws.on("message", (m) => {
				call(String(m), (data) => {
					ws.send(data)
				})
			})
		})
	}
}

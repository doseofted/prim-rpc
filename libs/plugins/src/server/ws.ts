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
 *
 * This first example shows how to use this plugin by itself without a method handler.
 *
 * ```ts
 * import { createPrimServer } from "@doseofted/prim-rpc"
 * import { primMethodWs } from "@doseofted/prim-rpc-plugins"
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
 * import { primMethodFastify, primMethodWs } from "@doseofted/prim-rpc-plugins"
 *
 * const fastify = Fastify()
 * const wss = new WebSocketServer({ server: fastify.server })
 * const prim = createPrimServer({
 *   methodHandler: primMethodFastify({ fastify }),
 *   callbackHandler: primMethodWs({ wss })
 * })
 * ```
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
					m as unknown as string,
					data => {
						ws.send(data)
					},
					context
				)
			})
		})
	}
}

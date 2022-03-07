import type { RpcCall, PrimServer } from "prim"
import type { FastifyPluginAsync } from "fastify"
import type * as Express from "express"
import type { WebSocketServer } from "ws"

/**
 * Prim's Fastify plugin. Use like so:
 * 
 * ```typescript
 * import { primFasifyPlugin } from "prim-plugins"
 * import { createPrimServer } from "prim"
 * import * as example from "example"
 * // ...
 * const prim = createPrimServer(example)
 * fastify.register(primFasifyPlugin, { prim })
 * ```
 */
export const primFasifyPlugin: FastifyPluginAsync<{ prim: PrimServer, prefix?: string }> = async (fastify, options) => {
	const { prefix = "/prim", prim } = options
	fastify.route<{ Body: RpcCall, Params: { method?: string } }>({
		method: ["POST", "GET"],
		url: `${prefix}*`,
		handler: async ({ url, body }, reply) => {
			const response = await prim.rpc({ prefix, url, body })
			reply.send(response)
		}
	})
}

// IDEA: separate Prim Server instance from middleware in this module. Prim Server currently returns
// the instance alone but I could turn this export into an object containing the RPC function (the instance)
// and the event emitter. The shared event emitter could then be passed to a Prim plugin for different 
// websocket clients (since websockets are optional and only used if functions have a callback)

// TODO: actually test this
/**
 * Prim's Express/Connect middleware. Use like so:
 * 
 * ```typescript
 * import { primExpressMiddleware } from "prim-plugins"
 * import * as example from "example"
 * // ...
 * expressApp.use(primExpressMiddleware(example, "/prim"))
 * ```
 */
export const primExpressMiddleware = (prim: PrimServer, prefix = "/prim") => {
	return async (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
		const { method, url, body } = req
		const acceptedMethod = method === "GET" || method === "POST"
		const primPrefix = url.includes(prefix)
		const isPrimRequest = acceptedMethod && primPrefix
		if (!isPrimRequest) { next(); return }
		const response = await prim.rpc({ prefix, url, body })
		res.json(response)
	}
}

// TODO write a "ws" (node module) websocket handler to be used with Prim's "socket" option
// so that websocket callbacks don't have to be wired up manually
export const primWebSocketServerSetup = (prim: PrimServer, socket: WebSocketServer) => {
	socket.on("connection", (ws) => {
		prim.ws.emit("connect")
		ws.on("message", async (data) => {
			const rpc = JSON.parse(String(data))
			prim.rpc(rpc)
			prim.ws.on("response", (cbAnswer) => {
				ws.send(JSON.stringify(cbAnswer))
			})
		})
		ws.on("close", () => {
			prim.ws.emit("end")
		})
	})
}

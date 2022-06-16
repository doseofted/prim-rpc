/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */
import type { RpcCall, PrimServer } from "@doseofted/prim-rpc"
import type { FastifyPluginAsync } from "fastify"
import type * as Express from "express"
import type { WebSocketServer } from "ws"
import type { Server as SocketIoServer } from "socket.io"

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
		url: "*", // NOTE: fastify handles prefix already
		handler: async ({ url, body }, reply) => {
			const response = await prim.rpc({ prefix, url, body })
			reply.send(response)
		},
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
 * import { createPrimServer } from "prim"
 * import * as example from "example"
 * // ...
 * const prim = createPrimServer(example)
 * expressApp.use(primExpressMiddleware(prim))
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

/**
 * Prim's support for the "ws" client. Use like so:
 * 
 * ```typescript
 * import { primWebSocketServerSetup } from "prim-plugins"
 * import { createPrimServer } from "prim"
 * // ...
 * const prim = createPrimServer(example)
 * const wsServer = new WebSocketServer({ server })
 * primWebSocketServerSetup(prim, wsServer)
 * ```
 */
export const primWebSocketServerSetup = (prim: PrimServer, socket: WebSocketServer) => {
	const jsonHandler = prim.opts.jsonHandler ?? JSON
	socket.on("connection", (ws) => {
		// prim.ws.emit("connect")
		ws.on("message", (data) => {
			const rpc = jsonHandler.parse(String(data))
			prim.rpc(rpc)
			prim.ws.on("response", (cbAnswer) => {
				ws.send(jsonHandler.stringify(cbAnswer))
			})
		})
		ws.on("close", () => {
			prim.ws.emit("ended")
		})
	})
}

// TODO actually test this
/**
 * Prim's support for the "socket.io" client. Use like so:
 * 
 * ```typescript
 * import { primWebSocketServerSetup } from "prim-plugins"
 * import { createPrimServer } from "prim"
 * // ...
 * const prim = createPrimServer(example)
 * const wsServer = new SocketIoServer(server)
 * primSocketIoServerSetup(prim, wsServer)
 * ```
 */
export const primSocketIoServerSetup = (prim: PrimServer, socket: SocketIoServer) => {
	const jsonHandler = prim.opts.jsonHandler ?? JSON
	socket.on("connection", (ws) => {
		// prim.ws.emit("connect")
		ws.on("prim", (data) => {
			const rpc = jsonHandler.parse(String(data))
			prim.rpc(rpc)
			prim.ws.on("response", (cbAnswer) => {
				ws.emit("prim", jsonHandler.stringify(cbAnswer))
			})
		})
		ws.on("close", () => {
			prim.ws.emit("ended")
		})
	})
}

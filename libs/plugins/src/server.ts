/**
 * NOTE: Server frameworks call on Prim so all "plugins" here are really plugins
 * for server frameworks and not for Prim (whereas Prim client plugins are intended
 * to be options, or "plugins," for Prim).
 */

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
 * import { primFastifyPlugin } from "prim-plugins"
 * import { createPrimServer } from "prim"
 * import * as example from "example"
 * // ...
 * const prim = createPrimServer(example)
 * fastify.register(primFastifyPlugin, { prim })
 * ```
 */
export const primFastifyPlugin: FastifyPluginAsync<{ prim: PrimServer, prefix?: string }> = async (fastify, options) => {
	const { prefix = "/prim", prim } = options
	// TODO: consider using "raw-body" module to get body as string to avoid extra stringify of JSON by Prim
	// LINK: https://github.com/fastify/fastify/issues/707#issuecomment-364803293
	// fastify.addContentTypeParser("*", (req, done) => { done() })
	fastify.route<{ Body: RpcCall, Params: { method?: string } }>({
		method: ["POST", "GET"],
		url: "*", // NOTE: fastify handles prefix already
		handler: async ({ url, body }, reply) => {
			const client = prim()
			const response = await client.rpc({ prefix, url, body })
			// TODO: consider adding headers for return type (for instance, JSON headers or, just an idea,
			// alternative headers if custom JSON handler is used like YAML even though that's arguably a bad idea)
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
		prim.ws.emit("connected")
		ws.on("message", (data) => {
			const rpc = jsonHandler.parse(String(data))
			prim.rpc(rpc).then(_result => {
				// TODO: add websocket send for RPC to avoid using HTTP when socket is open
				// console.log(rpc, result)
				// if (result) { ws.send(jsonHandler.stringify(result)) }
			})
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
		prim.ws.emit("connected")
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

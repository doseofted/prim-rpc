/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Fastify from "fastify"
import multipartPlugin from "@fastify/multipart"
import Cors from "@fastify/cors"
import { WebSocketServer } from "ws"
import jsonHandler from "superjson"
import * as module from "@doseofted/prim-example"
import { createPrimServer } from "@doseofted/prim-rpc"
import { primMethodFastify } from "@doseofted/prim-plugins/dist/server/fastify.mjs"
import { primCallbackWs } from "@doseofted/prim-plugins/dist/server/ws.mjs"

async function start() {
	const contained = JSON.parse(process.env.CONTAINED ?? "false") === true

	const fastify = Fastify({ logger: true })
	await fastify.register(Cors, { origin: contained ? `https://${process.env.WEBSITE_HOST}` : "http://localhost:5173" })
	const wss = new WebSocketServer({ server: fastify.server })

	// to be used for manual calls
	createPrimServer({
		prefix: "/prim",
		module,
		methodHandler: primMethodFastify({ fastify }),
	// FIXME: can't initialize websocket plugin twice, find workaround (WS plugin for Fastify might integrate better?)
	// LINK https://github.com/websockets/ws#multiple-servers-sharing-a-single-https-server
	})
	// used with client for wider range of parsed JSON types
	createPrimServer({
		prefix: "/prim-super",
		jsonHandler,
		module,
		methodHandler: primMethodFastify({ fastify, multipartPlugin }),
		callbackHandler: primCallbackWs({ wss }),
	})

	try {
		const host = contained ? "::" : "localhost"
		await fastify.listen({ host, port: 3001 })
	} catch (err) {
		if (err) {
			fastify.log.error(err)
			process.exit(1)
		}
	}
}

void start()

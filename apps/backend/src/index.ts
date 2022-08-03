/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Fastify from "fastify"
import Cors from "@fastify/cors"
import { WebSocketServer } from "ws"
import * as example from "@doseofted/prim-example"
import { createPrimServer } from "@doseofted/prim-rpc"
import { primFastifyPlugin, primWebSocketServerSetup } from "@doseofted/prim-plugins"
import jsonHandler from "superjson"

const contained = JSON.parse(process.env.CONTAINED ?? "false") === true

const fastify = Fastify({ logger: true })
const websocket = new WebSocketServer({ server: fastify.server })

const prim = createPrimServer(example, { jsonHandler })
await fastify.register(primFastifyPlugin, { prim, prefix: "/prim" })
primWebSocketServerSetup(prim, websocket)
await fastify.register(Cors, { origin: contained ? `https://${process.env.WEBSITE_HOST}` : "http://localhost:5173" })

try {
	const host = contained ? "::" : "localhost"
	await fastify.listen({ port: 3001, host })
} catch (err) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
}

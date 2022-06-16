/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Fastify from "fastify"
import Cors from "@fastify/cors"
import { WebSocketServer } from "ws"
import * as example from "@doseofted/prim-example"
import { createPrimServer } from "@doseofted/prim-rpc"
import { primFasifyPlugin, primWebSocketServerSetup } from "@doseofted/prim-plugins"

// const { createPrimServer } = await import("prim")

const fastify = Fastify()
const websocket = new WebSocketServer({ server: fastify.server })

const prim = createPrimServer(example)
await fastify.register(primFasifyPlugin, { prim, prefix: "/prim" })
primWebSocketServerSetup(prim, websocket)
await fastify.register(Cors, { origin: `https://${process.env.HOST}` })

try {
	await fastify.listen({ port: 3001, host: "0.0.0.0" })
} catch (err) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
}

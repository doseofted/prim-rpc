/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Fastify from "fastify"
import Cors from "@fastify/cors"
import { WebSocketServer } from "ws"
import * as example from "@doseofted/prim-example"
import { createPrimServer } from "@doseofted/prim-rpc"
import { primFastifyPlugin, primWebSocketServerSetup } from "@doseofted/prim-plugins"

const fastify = Fastify()
const websocket = new WebSocketServer({ server: fastify.server })

const prim = createPrimServer(example)
void fastify.register(primFastifyPlugin, { prim, prefix: "/prim" })
primWebSocketServerSetup(prim, websocket)
void fastify.register(Cors, { origin: `https://${process.env.WEBSITE_HOST}` })

try {
	void fastify.listen({ port: 3001, host: "0.0.0.0" })
	fastify.log.info("Server is listening.")
} catch (err) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
}

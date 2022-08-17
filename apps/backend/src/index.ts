/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Fastify from "fastify"
import Cors from "@fastify/cors"
import { WebSocketServer } from "ws"
import jsonHandler from "superjson"
import * as module from "@doseofted/prim-example"
import { createPrimServer } from "@doseofted/prim-rpc"
import { primMethodFastify, primMethodWs } from "@doseofted/prim-plugins"

const contained = JSON.parse(process.env.CONTAINED ?? "false") === true

const fastify = Fastify({ logger: true })
await fastify.register(Cors, { origin: contained ? `https://${process.env.WEBSITE_HOST}` : "http://localhost:5173" })
const wss = new WebSocketServer({ server: fastify.server })

createPrimServer({
	prefix: "/prim",
	module,
	jsonHandler,
	methodHandler: primMethodFastify({ fastify }),
	callbackHandler: primMethodWs({ wss }),
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

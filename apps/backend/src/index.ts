/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Fastify from "fastify"
import Cors from "@fastify/cors"
import { WebSocketServer } from "ws"
import jsonHandler from "superjson"
import * as module from "@doseofted/prim-example"
import { createPrimServer } from "@doseofted/prim-rpc"
import { primMethodFastify, primCallbackWs } from "@doseofted/prim-plugins"

const contained = JSON.parse(process.env.CONTAINED ?? "false") === true

const fastify = Fastify({ logger: true })
await fastify.register(Cors, { origin: contained ? `https://${process.env.WEBSITE_HOST}` : "http://localhost:5173" })
const wss = new WebSocketServer({ server: fastify.server })

// to be used for manual calls
const options = {
	prefix: "/prim",
	module,
	methodHandler: primMethodFastify({ fastify }),
	callbackHandler: primCallbackWs({ wss }),
}
createPrimServer(options)
// used with client for wider range of parsed JSON types
createPrimServer({
	...options,
	prefix: "/prim-super",
	jsonHandler,
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

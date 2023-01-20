import Fastify from "fastify"
import multipartPlugin from "@fastify/multipart"
import Cors from "@fastify/cors"
import { WebSocketServer } from "ws"
import jsonHandler from "superjson"
import { createPrimServer } from "@doseofted/prim-rpc"
import { createMethodHandler } from "@doseofted/prim-rpc-plugins/fastify"
import { createCallbackHandler } from "@doseofted/prim-rpc-plugins/ws"
import * as module from "@doseofted/prim-example"

/** Flag to determine if project is running locally or in a container */
const contained = JSON.parse(process.env.CONTAINED ?? "false") === true

// Setup Fastify (HTTP server)
const fastify = Fastify({ logger: true })
await fastify.register(Cors, { origin: contained ? `https://${process.env.WEBSITE_HOST}` : "http://localhost:3000" })
// Setup WS-Server (WebSocket server)
const wss = new WebSocketServer({ server: fastify.server })

const methodHandler = createMethodHandler({
	fastify,
	multipartPlugin,
	contextTransform: req => req.headers,
})
const callbackHandler = createCallbackHandler({ wss })
// Setup Prim Server, configured with chosen HTTP/WS server
createPrimServer({
	prefix: "/prim",
	jsonHandler,
	module,
	methodHandler,
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
	callbackHandler,
	allowList: { startCase: true },
})

// Start listening for requests to server
try {
	const host = contained ? "::" : "localhost"
	await fastify.listen({ host, port: 3001 })
} catch (err) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
}

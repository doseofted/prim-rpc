import Fastify from "fastify"
import multipartPlugin from "@fastify/multipart"
import Cors from "@fastify/cors"
import { WebSocketServer } from "ws"
import jsonHandler from "superjson"
import { createPrimServer } from "@doseofted/prim-rpc"
import { createMethodHandler } from "@doseofted/prim-rpc-plugins/fastify"
import { createCallbackHandler } from "@doseofted/prim-rpc-plugins/ws"
import * as module from "@doseofted/prim-example"

const { sayHello } = module
// if server is hosted publicly / in production, limit the functions that are allowed to run
// (since example module's purpose is just for testing)
const filteredModule = process.env.NODE_ENV === "development" ? module : { sayHello }

/** Flag to determine if project is running locally or in a container */
const contained = JSON.parse(process.env.CONTAINED ?? "false") === true

// Setup Fastify (HTTP server)
const fastify = Fastify({ trustProxy: true, logger: true })
await fastify.register(Cors, { origin: contained ? `https://${process.env.WEBSITE_HOST}` : "http://localhost:3000" })
// Setup WS-Server (WebSocket server)
const wss = new WebSocketServer({ server: fastify.server })

const methodHandler = createMethodHandler({
	fastify,
	multipartPlugin,
})
const callbackHandler = createCallbackHandler({ wss })
// Setup Prim Server, configured with chosen HTTP/WS server
createPrimServer({
	prefix: "/prim",
	jsonHandler,
	module: filteredModule,
	methodHandler,
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

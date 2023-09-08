import Fastify from "fastify"
import Cors from "@fastify/cors"
import multipartPlugin from "@fastify/multipart"
import formDataHandler from "form-data"
import { WebSocketServer } from "ws"
import superjson from "superjson"
import { encode, decode } from "@msgpack/msgpack"
import { createPrimServer } from "@doseofted/prim-rpc"
import { createMethodHandler } from "@doseofted/prim-rpc-plugins/fastify"
import { createCallbackHandler } from "@doseofted/prim-rpc-plugins/ws"
import * as module from "@doseofted/prim-example"

// Setup Fastify (HTTP server)
const fastify = Fastify({ trustProxy: true, logger: true })
await fastify.register(Cors)
const methodHandler = createMethodHandler({
	fastify,
	multipartPlugin,
	formDataHandler,
})

// Setup WS-Server (WebSocket server)
const wss = new WebSocketServer({ server: fastify.server })
const callbackHandler = createCallbackHandler({ wss })

// Optionally set up JSON handler
const useCustomJsonHandler: keyof typeof jsonOptions = "none"
const jsonOptions = {
	advanced: superjson,
	binary: { mediaType: "application/octet-stream", stringify: encode, parse: decode, binary: true },
	none: JSON,
}
const jsonHandler = jsonOptions[useCustomJsonHandler]

// Setup Prim Server, configured with chosen HTTP/WS server
createPrimServer({
	prefix: "/prim",
	jsonHandler,
	module,
	methodHandler,
	callbackHandler,
	allowList: { startCase: true },
	methodsOnMethods: ["docs"],
})

// Start listening for requests to server
try {
	await fastify.listen({ host: "::", port: 3001 })
} catch (err) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
}

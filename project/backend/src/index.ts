import Fastify from "fastify"
import Cors from "@fastify/cors"
import { WebSocketServer } from "ws"
import * as example from "@doseofted/prim-example"
import { createPrimServer } from "@doseofted/prim"
import { primFasifyPlugin, primWebSocketServerSetup } from "@doseofted/prim-plugins"

// const { createPrimServer } = await import("prim")
console.log();

const fastify = Fastify({
	logger: {
		prettyPrint: process.env.NODE_ENV === "development"
			? {
				colorize: true,
				translateTime: "UTC:h:MM:ssTT",
				ignore: "req.remoteAddress,req.remotePort"
			}
			: false
	}
})
const websocket = new WebSocketServer({ server: fastify.server })
const prim = createPrimServer(example)

fastify.register(primFasifyPlugin, { prim, prefix: "/prim" })
primWebSocketServerSetup(prim, websocket)
fastify.register(Cors, { origin: `https://${process.env.HOST}` })

fastify.listen(3001, "0.0.0.0", function (err) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
})

import Fastify from "fastify"
import Cors from "fastify-cors"
import { WebSocketServer } from "ws"
import * as example from "example"
import { createPrimServer } from "prim"
import { primFasifyPlugin, primWebSocketServerSetup } from "prim-plugins"

// const { createPrimServer } = await import("prim")

const fastify = Fastify({ logger: true })
const websocket = new WebSocketServer({ server: fastify.server })
const prim = createPrimServer(example)

fastify.register(primFasifyPlugin, { prim })
primWebSocketServerSetup(prim, websocket)
fastify.register(Cors, { origin: `https://${process.env.HOST}` })

fastify.listen(3001, "0.0.0.0", function (err) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
})

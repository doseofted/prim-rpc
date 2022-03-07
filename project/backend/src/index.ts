import Fastify from "fastify"
import Cors from "fastify-cors"
import { WebSocketServer } from "ws"
import * as example from "example"
import { createPrimServer } from "prim"
import { primFasifyPlugin, primWebSocketServerSetup } from "prim-plugins"

const fastify = Fastify({ logger: true })
fastify.register(Cors, { origin: `https://${process.env.HOST}` })
const wsServer = new WebSocketServer({ server: fastify.server })
/* wsServer.on("connection", (ws) => {
	ws.on("message", (data) => {
		const rpc = JSON.parse(String(data))
		ws.send(rpc)
	})
}) */
const prim = createPrimServer(example)
fastify.register(primFasifyPlugin, { prim })
primWebSocketServerSetup(prim, wsServer)

fastify.listen(3001, "0.0.0.0", function (err) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
})

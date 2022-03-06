import Fastify from "fastify"
import Cors from "fastify-cors"
import { WebSocketServer } from "ws"
import { primFasifyPlugin } from "prim-plugins"
import * as example from "example"

const fastify = Fastify({ logger: true })
fastify.register(Cors, { origin: `https://${process.env.HOST}` })
const wsServer = new WebSocketServer({ server: fastify.server })
wsServer.on("connection", (ws) => {
	ws.on("message", (data) => {
		const rpc = JSON.parse(String(data))
		ws.send(rpc)
	})
})
fastify.register(primFasifyPlugin, {
	module: example
})

fastify.listen(3001, "0.0.0.0", function (err) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
})

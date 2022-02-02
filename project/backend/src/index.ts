import Fastify, { FastifyPluginAsync } from "fastify"
import Cors from "fastify-cors"
import * as example from "example"
import { prim as setupPrim, RpcCall } from "prim"

const { you } = example

const pluginTest: FastifyPluginAsync<{ example: object }> = async (fastify, { example }) => {
	const prim = setupPrim(example)
	fastify.route<{ Body: RpcCall }>({
		method: "POST",
		url: "/",
		handler: ({ body }, reply) => {
			reply.send(prim(body))
		}
	})
}

const fastify = Fastify({ logger: true })
fastify.register(pluginTest, { example, prefix: "/json" })
fastify.register(Cors, { origin: `https://${process.env.COMPOSE_HOST}` })

fastify.get("/", function (request, reply) {
	reply.send({ Hello: you })
})

fastify.listen(3001, "0.0.0.0", function (err) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
})

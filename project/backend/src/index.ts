import Fastify from "fastify"
import Cors from "fastify-cors"
import fp from "fastify-plugin"
import * as example from "example"
import { createPrimServer, RpcCall } from "prim"

function primFasifyPlugin<T extends Record<V, T[V]>, V extends keyof T = keyof T>() {
	return fp<{ module: T, prefix?: string }>(async (fastify, options) => {
		const prim = createPrimServer({ server: true }, options.module)
		fastify.route<{ Body: RpcCall<V, Parameters<T[V]>>, Params: { method?: keyof T } }>({
			method: ["POST", "GET"],
			url: `${options.prefix ?? "/"}`,
			handler: ({ body }, reply) => {
				// TODO: add support for query strings (simple requests, for linked data, similar to JSON-LD links)
				reply.send(prim(body))
			}
		})
	})
}

const fastify = Fastify({ logger: true })
fastify.register(primFasifyPlugin(), { module: example })
fastify.register(Cors, { origin: `https://${process.env.COMPOSE_HOST}` })


fastify.listen(3001, "0.0.0.0", function (err) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
})

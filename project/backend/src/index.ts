import Fastify from "fastify"
import Cors from "fastify-cors"
import fp from "fastify-plugin"
import * as example from "example"
import { createPrimServer, RpcCall } from "prim"

function primFasifyPlugin<T extends Record<V, T[V]>, V extends keyof T = keyof T>() {
	return fp<{ module: T, prefix?: string }>(async (fastify, options) => {
		const { prefix = "/prim" } = options
		const prim = createPrimServer({ server: true }, options.module)
		fastify.route<{ Body: RpcCall, Params: { method?: string } }>({
			method: ["POST", "GET"],
			url: `${prefix}`,
			handler: async ({ body, url: path, query }, reply) => {
				const response = await prim({ path, prefix, body, query })
				reply.send(response)
			}
		})
	})
}

const fastify = Fastify({ logger: true })
fastify.register(primFasifyPlugin(), { module: example })
fastify.register(Cors, { origin: `https://${process.env.HOST}` })

fastify.listen(3001, "0.0.0.0", function (err) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
})

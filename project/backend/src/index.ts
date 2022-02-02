import Fastify, { FastifyPluginAsync } from "fastify"
import Cors from "fastify-cors"
import * as example from "example"
import { prim as setupPrim, RpcCall } from "prim"

const { you } = example

const pluginTest: FastifyPluginAsync<{ example: object }> = async (fastify, { example }) => {
	const prim = setupPrim(example)
	fastify.route<{ Body: RpcCall, Querystring: unknown }>({
		method: "POST",
		url: "/",
		handler: ({ body, query }, reply) => {
			// NOTE: by using the query, some options could be passed in the URL
			// for use with JSON-LD (they'll just be passed to parameters in RPC call
			// so it doesn't matter if given in body or query, but if given in both
			// then the body of the request should be prioritized for the sake of
			// somewhat followng JSON-RPC).
			// One useful place for this is numbering pages of data. A link could be
			// clicked to bring user to another request
			// TODO: the JSON-RPC ID given has to be unique enough to correlate request for
			// additional pages back to original POST request, since all clicks on links
			// to gather additional pages would be GET requests and would lose JSON-RPC
			// parameters. It is always encouraged to send POST requests to the JSON-RPC
			// endpoints but using GET requests to further gather linked data will make using this
			// kind of API so much easier (for instance, I can literally click a link
			// to go to the next page of data)
			let params = typeof body.params === "object" ? body.params : {}
			if (typeof query === "object") { params = { ...params, ...query } }
			// TODO: consider using lodash's merge or "defu" library for mergng query into params of RPC call
			console.log(params)
			reply.send(prim({ ...body, params }))
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

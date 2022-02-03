import Fastify, { FastifyPluginAsync } from "fastify"
import Cors from "fastify-cors"
import * as example from "example"
import { prim as setupPrim, RpcCall } from "prim"
import defu from "defu"

const { you } = example

const pluginTest: FastifyPluginAsync<{ example: object }> = async (fastify, { example }) => {
	const prim = setupPrim(example)
	fastify.route<{ Body: RpcCall, Querystring: unknown, Params: { method?: string } }>({
		method: ["POST", "GET"],
		url: "/:method?",
		handler: ({ body, query, params: { method = "prim" } }, reply) => {
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
			// NOTE: to keep ID even more unique, I may attach method name in params
			// and then use a UUID to correlate requests. In general, any GET request
			// made after a JSON-RPC/POST request is only to grab related data to first
			// request and queries to GET request should be kept as simple as possible
			// such as "?page=2" or "?linked=<ref_id>"
			const isPositional = (q: unknown) => typeof q === "object" && "-" in q && Object.keys(q).length === 1
			// NOTE: when given params over query string, they should be be simple arguments like number, string or boolean
			// and if complex: objects should be given like prop.subprop=..., arrays like possiblyArray=1,2,3
			/* const isPositional = (...given: unknown[]) => given
				.map(q => typeof q === "object" && Object.keys(q).length === 1 && ("-" in q))
				.reduce((p, n) => p || n, false) */
			// TODO: if body is not given, check query for body and 
			const givenIsPositional = isPositional(query) && !body
			const params = givenIsPositional ? query["-"] : (Object.keys(query).length > 0 ? query : undefined)
			const defaults: RpcCall = {
				method,
				params,
				id: null,
				jsonrpc: "2.0"
			}
			const send = defu<RpcCall, RpcCall>(body, defaults)
			console.log(send)
			reply.send(prim(send))
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

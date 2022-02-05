import Fastify from "fastify"
import Cors from "fastify-cors"
import fp from "fastify-plugin"
import * as example from "example"
import { createPrimServer, RpcCall } from "prim"

function createPlugin<T extends Record<V, T[V]>, V extends keyof T = keyof T>() {
	return fp<{ module: T, prefix: string }>(async (fastify, options) => {
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

// NOTE: below includes the ability to use query string as RPC body. I'd like to add this back in plugin above
// eslint-disable-next-line @typescript-eslint/no-explicit-any
/* const pluginTest: FastifyPluginAsync<{ module: any }> = async (fastify, { module: givenModule }) => {
	const prim = createPrimServer({ server: true }, givenModule)
	fastify.route<{ Body: RpcCall, Querystring: unknown, Params: { method?: string } }>({
		method: ["POST", "GET"],
		url: "/:method?",
		handler: ({ body: postBody, query, params: { method } }, reply) => {
			const defaultBody: RpcCall = { id: null, method: "prim", params: undefined }
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
			// NOTE: if body is given, it should be like JSON-RPC but if given through URL,
			// it should be used as defaults unless overriden by RPC call in request body
			const isPositional = (q: unknown) => typeof q === "object"
				&& query?.constructor.name === "Object"
				&& "-" in q
				&& Object.keys(q).length === 1
			// NOTE: when given params over query string, they should be be simple arguments like number, string or boolean
			// and if complex: objects should be given like prop.subprop=..., arrays like possiblyArray=1,2,3
			// const isPositional = (...given: unknown[]) => given
			// 	.map(q => typeof q === "object" && Object.keys(q).length === 1 && ("-" in q))
			// 	.reduce((p, n) => p || n, false)
			// TODO: if body is not given, check query for body and 
			const givenIsPositional = !postBody && isPositional(query)
			const params = givenIsPositional ? (query ?? {})["-"] : query
			const getBody: RpcCall = { method, params }
			const send = defu<RpcCall, RpcCall>(postBody, getBody, defaultBody)
			console.log(send)
			reply.send(prim(send))
		}
	})
} */

const fastify = Fastify({ logger: true })
fastify.register(createPlugin(), { module: example, prefix: "/json" })
// fastify.register(pluginTest, { module: example, prefix: "/json" })
fastify.register(Cors, { origin: `https://${process.env.COMPOSE_HOST}` })

fastify.get("/", function (request, reply) {
	reply.send({ Hello: example.you })
})

fastify.listen(3001, "0.0.0.0", function (err) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
})

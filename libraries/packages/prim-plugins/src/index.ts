import { RpcCall, createPrimServer, PrimOptions } from "prim"
import type { FastifyPluginAsync } from "fastify"

interface PrimFastifyOptions {
	// Prims-specific options
	options?: PrimOptions
	module: unknown
	// Fastify-specific options
	prefix?: string
}

export const primFasifyPlugin: FastifyPluginAsync<PrimFastifyOptions> = async (fastify, options) => {
	const { prefix = "/prim", options: primOptions = {}, module: givenModule } = options
	primOptions.server = true // this is true since it is being used from a server framework
	const prim = createPrimServer(primOptions, givenModule)
	fastify.route<{ Body: RpcCall, Params: { method?: string } }>({
		method: ["POST", "GET"],
		url: `${prefix}`,
		handler: async ({ body, url: path, query }, reply) => {
			const response = await prim({ path, prefix, body, query })
			reply.send(response)
		}
	})
}

export const primExpressPlugin = (_req: Request, _res: Response, _next: () => void) => {
	// ...
}

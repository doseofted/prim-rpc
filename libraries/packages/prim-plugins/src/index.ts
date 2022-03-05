import { RpcCall, createPrimServer, PrimOptions } from "prim"
import type { FastifyPluginAsync } from "fastify"
import type * as Express from "express"

interface PrimFastifyOptions {
	// Prims-specific options
	options?: PrimOptions
	module: unknown
	// Fastify-specific options
	prefix?: string
}

/**
 * Prim's Fastify plugin. Use like so:
 * 
 * ```typescript
 * import { primFasifyPlugin } from "prim-plugins"
 * import * as example from "example"
 * // ...
 * fastify.register(primFasifyPlugin, { module: example })
 * ```
 */
export const primFasifyPlugin: FastifyPluginAsync<PrimFastifyOptions> = async (fastify, options) => {
	const { prefix = "/prim", options: primOptions = {}, module: givenModule } = options
	primOptions.server = true // this is always true since it is being used from a server framework
	const prim = createPrimServer(primOptions, givenModule)
	fastify.route<{ Body: RpcCall, Params: { method?: string } }>({
		method: ["POST", "GET"],
		url: `${prefix}`,
		handler: async ({ body, url: path, query }, reply) => {
			const response = await prim({ prefix, path, body, query })
			reply.send(response)
		}
	})
}

// TODO: actually test this
/**
 * Prim's Express/Connect middleware. Use like so:
 * 
 * ```typescript
 * import { primExpressMiddleware } from "prim-plugins"
 * import * as example from "example"
 * // ...
 * expressApp.use("/prim", primExpressMiddleware(example, "/prim"))
 * ```
 */
export const primExpressMiddleware = (givenModule: unknown, prefix = "/prim", options: PrimOptions = { server: true }) => {
	options.server = true // this is always true since it is being used from a server framework
	const prim = createPrimServer(options, givenModule)
	return async (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
		if (!(req.method === "GET" || (req.method === "POST"))) {
			next() // not intended for Prim
		}
		const { path, query, body } = req
		const response = await prim({ prefix, path, body, query })
		res.json(response)
	}
}

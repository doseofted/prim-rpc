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
		url: `${prefix}*`,
		handler: async ({ url, body }, reply) => {
			const response = await prim({ prefix, url, body })
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
 * expressApp.use(primExpressMiddleware(example, "/prim"))
 * ```
 */
export const primExpressMiddleware = (givenModule: unknown, prefix = "/prim", options: PrimOptions = { server: true }) => {
	options.server = true // this is always true since it is being used from a server framework
	const prim = createPrimServer(options, givenModule)
	return async (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
		const { method, url, body } = req
		const acceptedMethod = method === "GET" || method === "POST"
		const primPrefix = url.includes(prefix)
		const isPrimRequest = acceptedMethod && primPrefix
		if (!isPrimRequest) { next(); return }
		const response = await prim({ prefix, url, body })
		res.json(response)
	}
}

// TODO write a "ws" (node module) websocket handler to be used with Prim's "socket" option
// so that websocket callbacks don't have to be wired up manually

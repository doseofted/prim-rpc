import { RpcCall, createPrimServer } from "prim"
import type { FastifyPluginAsync } from "fastify"

export function primFasifyPlugin<T extends Record<V, T[V]>, V extends keyof T = keyof T>() {
	const plugin: FastifyPluginAsync<{ module: T, prefix?: string }> = async (fastify, options) => {
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
	}
	return plugin
}

/* export function primFasifyPlugin<T extends Record<V, T[V]>, V extends keyof T = keyof T>() {
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
} */

export function primExpressPlugin(_req: Request, _res: Response, _next: () => void) {
	// ...
}

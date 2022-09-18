import type { PrimServerMethodHandler, PrimServerEvents } from "@doseofted/prim-rpc"
import type { FastifyPluginAsync, FastifyInstance, FastifyError, FastifyPluginCallback, RawServerDefault, FastifyTypeProviderDefault } from "fastify"
import type { FastifyMultipartAttactFieldsToBodyOptions, FastifyMultipartOptions } from "@fastify/multipart"

interface PrimFastifyPluginOptions {
	prim: PrimServerEvents,
	multipartPlugin?: FastifyPluginCallback< // NOTE: interface for @fastify/multipart plugin
	FastifyMultipartOptions|FastifyMultipartAttactFieldsToBodyOptions,
	RawServerDefault,
	FastifyTypeProviderDefault
	>
}
/**
 * A Fastify plugin used to register Prim with the server. Use like so:
 * 
 * ```ts
 * import Fastify from "fastify"
 * import { createPrimServer } from "@doseofted/prim-rpc"
 * import { fastifyPrimPlugin } from "@doseofted/prim-plugins"
 *
 * const fastify = Fastify()
 * const prim = createPrimServer()
 * fastify.register(fastifyPrimPlugin, { prim })
 * ```
 * 
 * To let Prim handle registration with Fastify, try importing `primFastifyMethod`
 */
// eslint-disable-next-line @typescript-eslint/require-await
export const fastifyPrimPlugin: FastifyPluginAsync<PrimFastifyPluginOptions> = async (fastify, options) => {
	const { prim, multipartPlugin } = options
	if (multipartPlugin) {
		await fastify.register(multipartPlugin)
	}
	// LINK https://github.com/fastify/help/issues/158#issuecomment-1086190754
	fastify.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
		try {
			done(null, body)
		} catch (e) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const error: FastifyError = e; error.statusCode = 500
			done(error, undefined)
		}
	})
	fastify.route<{ Body: string }>({
		method: ["GET", "POST"],
		url: prim.options.prefix,
		handler: async (request, reply) => {
			// TODO: read RPC for `_bin_` references and call `request.files()` only when needed
			if (multipartPlugin) {
				const parts = request.files()
				for await (const part of parts) {
					console.log("Given a file:", part)
				}
			}
			const { body, method, raw: { url } } = request
			const response = await prim.server().call({ method, url, body })
			void reply.status(response.status).headers(response.headers).send(response.body)
		},
	})
	fastify.route<{ Body: string }>({
		method: "GET",
		url: prim.options.prefix + "/*",
		handler: async (request, reply) => {
			const { body, method, raw: { url } } = request
			const response = await prim.server().call({ method, url, body })
			void reply.status(response.status).headers(response.headers).send(response.body)
		},
	})
}

interface MethodFastifyOptions {
	fastify: FastifyInstance
	multipartPlugin?: FastifyPluginCallback< // NOTE: interface for @fastify/multipart plugin
	FastifyMultipartOptions|FastifyMultipartAttactFieldsToBodyOptions,
	RawServerDefault,
	FastifyTypeProviderDefault
	>
}
/**
 * A Prim plugin used to register itself with Fastify. Use like so:
 * 
 * ```ts
 * import Fastify from "fastify"
 * import { createPrimServer } from "@doseofted/prim-rpc"
 * import { primMethodFastify } from "@doseofted/prim-plugins"
 *
 * const fastify = Fastify()
 * const prim = createPrimServer({
 *   methodHandler: primMethodFastify({ fastify })
 * })
 * ```
 * 
 * If you would like to register Prim with Fastify yourself, try importing `fastifyPrimPlugin` instead.
 */
export const primMethodFastify = (options: MethodFastifyOptions): PrimServerMethodHandler => {
	const { fastify } = options
	return prim => {
		void fastify.register(fastifyPrimPlugin, {...options, prim })
	}
}

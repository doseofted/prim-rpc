import type { PrimServerMethodHandler, PrimServerEvents } from "@doseofted/prim-rpc"
import type { FastifyPluginAsync, FastifyInstance, FastifyError } from "fastify"
import type { MultipartFile, MultipartValue } from "@fastify/multipart"
import type { IncomingHttpHeaders } from "node:http"
import type FastifyMultipartPlugin from "@fastify/multipart"
import { pipeline } from "node:stream/promises"
import { createWriteStream } from "node:fs"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join as joinPath } from "node:path"

export type PrimFastifyContext = IncomingHttpHeaders

interface SharedFastifyOptions {
	multipartPlugin?: typeof FastifyMultipartPlugin
	fileSizeLimitBytes?: number,
}

interface PrimFastifyPluginOptions extends SharedFastifyOptions {
	prim: PrimServerEvents
}
/**
 * A Fastify plugin used to register Prim with the server. Use like so:
 * 
 * ```ts
 * // imports
 * import Fastify from "fastify"
 * import multipartPlugin from "@fastify/multipart"
 * import { createPrimServer } from "@doseofted/prim-rpc"
 * import { fastifyPrimPlugin } from "@doseofted/prim-plugins/dist/server/fastify.mjs"
 * // usage
 * const fastify = Fastify()
 * const prim = createPrimServer()
 * fastify.register(fastifyPrimPlugin, { prim, multipartPlugin })
 * await fastify.listen({ port: 3000 })
 * ```
 * 
 * **Note:** usage of the multipart plugin is optional and can be excluded if support
 * for file uploads is not needed.
 * 
 * To let Prim handle registration with Fastify, try importing `primMethodFastify`
 */
// eslint-disable-next-line @typescript-eslint/require-await
export const fastifyPrimPlugin: FastifyPluginAsync<PrimFastifyPluginOptions> = async (fastify, options) => {
	const { prim, multipartPlugin, fileSizeLimitBytes: fileSize } = options
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
			const blobs: { [identifier: string]: unknown } = {}
			let bodyForm: string
			if (multipartPlugin && request.isMultipart()) {
				// NOTE: @fastify/multipart doesn't seem to let me use `MultipartValue` type from `.parts()` so this is a workaround
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const parts: AsyncIterableIterator<MultipartFile & MultipartValue<string>> = request.parts({
					limits: { fileSize },
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				}) as AsyncIterableIterator<any>
				for await (const part of parts) {
					if (!part.file && part.fieldname === "rpc") {
						bodyForm = part.value
					} else if (part.file && part.fieldname.startsWith("_bin_")) {
						const tmpFolder = await mkdtemp(joinPath(tmpdir(), "prim-rpc-"))
						const tmpFile = joinPath(tmpFolder, part.filename)
						const filenamePromise = pipeline(part.file, createWriteStream(tmpFile)).then(() => tmpFile).catch(() => "")
						blobs[part.fieldname] = filenamePromise
					}
				}
			}
			const { body: bodyReq, method, raw: { url } } = request
			const body = bodyForm ?? bodyReq
			const context = { ...request.headers }
			const response = await prim.server().call({ method, url, body }, blobs, context)
			void reply.status(response.status).headers(response.headers).send(response.body)
		},
	})
	fastify.route<{ Body: string }>({
		method: "GET",
		url: prim.options.prefix + "/*",
		handler: async (request, reply) => {
			const { body, method, raw: { url } } = request
			const context = { ...request.headers }
			const response = await prim.server().call({ method, url, body }, null, context)
			void reply.status(response.status).headers(response.headers).send(response.body)
		},
	})
}

interface MethodFastifyOptions extends SharedFastifyOptions {
	fastify: FastifyInstance
}
/**
 * A Prim plugin used to register itself with Fastify. Use like so:
 * 
 * ```ts
 * // imports
 * import Fastify from "fastify"
 * import multipartPlugin from "@fastify/multipart"
 * import { createPrimServer } from "@doseofted/prim-rpc"
 * import { primMethodFastify } from "@doseofted/prim-plugins/dist/server/fastify.mjs"
 * // usage
 * const fastify = Fastify()
 * const prim = createPrimServer({
 *   methodHandler: primMethodFastify({ fastify, multipartPlugin })
 * })
 * await fastify.listen({ port: 3000 })
 * ```
 * 
 * **Note:** usage of the multipart plugin is optional and can be excluded if support
 * for file uploads is not needed.
 * 
 * If you would like to register Prim with Fastify yourself, try importing `fastifyPrimPlugin` instead.
 */
export const primMethodFastify = (options: MethodFastifyOptions): PrimServerMethodHandler => {
	const { fastify } = options
	return prim => {
		void fastify.register(fastifyPrimPlugin, {...options, prim })
	}
}

// Part of the Prim+RPC project ( https://prim.doseofted.com/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { PrimServerMethodHandler, PrimServerEvents } from "@doseofted/prim-rpc"
import type { FastifyPluginAsync, FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from "fastify"
import type FastifyMultipartPlugin from "@fastify/multipart"
import { pipeline } from "node:stream/promises"
import { createWriteStream } from "node:fs"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join as joinPath } from "node:path"

/** The default Prim context when used with Fastify. Overridden with `contextTransform` option. */
export type PrimFastifyContext = { context: "fastify"; request: FastifyRequest; reply: FastifyReply }

interface SharedFastifyOptions {
	multipartPlugin?: typeof FastifyMultipartPlugin
	fileSizeLimitBytes?: number
	contextTransform?: (req: FastifyRequest, res: FastifyReply) => unknown
}

interface PrimFastifyPluginOptions extends SharedFastifyOptions {
	prim: PrimServerEvents
}
/**
 * A Fastify plugin used to register Prim with the server.
 *
 * **Note:** usage of the multipart plugin is optional and can be excluded if support
 * for file uploads is not needed.
 *
 * To let Prim handle registration with Fastify, try importing `createMethodHandler` instead.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export const fastifyPrimRpc: FastifyPluginAsync<PrimFastifyPluginOptions> = async (fastify, options) => {
	const {
		prim,
		multipartPlugin,
		fileSizeLimitBytes: fileSize,
		contextTransform = (request, reply) => ({ context: "fastify", request, reply }),
	} = options
	if (multipartPlugin) {
		await fastify.register(multipartPlugin)
	}
	// LINK https://github.com/fastify/fastify/issues/534
	/* fastify.addContentTypeParser("application/octet-stream", (req, payload, done) => {
		let data: Buffer
		payload.on("data", chunk => {
			data = Buffer.concat([data, chunk].filter(given => given))
		})
		payload.on("error", () => {
			done(new Error("Buffer could not be read"))
		})
		payload.on("end", () => {
			done(null, data)
		})
	}) */
	// LINK https://github.com/fastify/help/issues/158#issuecomment-1086190754
	fastify.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
		try {
			done(null, body)
		} catch (e) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const error: FastifyError = e
			error.statusCode = 500
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
				const parts = request.parts({
					limits: { fileSize },
				})
				for await (const part of parts) {
					if (!("file" in part) && part.fieldname === "rpc") {
						bodyForm = part.value as string
					} else if ("file" in part && part.fieldname.startsWith("_bin_")) {
						const tmpFolder = await mkdtemp(joinPath(tmpdir(), "prim-rpc-"))
						const tmpFile = joinPath(tmpFolder, part.filename)
						const filenamePromise = pipeline(part.file, createWriteStream(tmpFile))
							.then(() => tmpFile)
							.catch(() => "")
						blobs[part.fieldname] = filenamePromise
					}
				}
			}
			const {
				body: bodyReq,
				method,
				raw: { url },
			} = request
			const body = bodyForm ?? bodyReq
			const context = contextTransform(request, reply)
			const response = await prim.server().call({ method, url, body }, blobs, context)
			// if (response.headers["content-type"] === "application/octet-stream") {
			// 	void reply.status(response.status).headers(response.headers).send(Buffer.from(response.body))
			// }
			void reply.status(response.status).headers(response.headers).send(response.body)
		},
	})
	fastify.route<{ Body: string }>({
		method: "GET",
		url: prim.options.prefix + "*",
		handler: async (request, reply) => {
			const {
				body,
				method,
				raw: { url },
			} = request
			const context = contextTransform(request, reply)
			const response = await prim.server().call({ method, url, body }, null, context)
			// if (response.headers["content-type"] === "application/octet-stream") {
			// 	void reply.status(response.status).headers(response.headers).send(Buffer.from(response.body))
			// }
			void reply.status(response.status).headers(response.headers).send(response.body)
		},
	})
}

interface MethodFastifyOptions extends SharedFastifyOptions {
	fastify: FastifyInstance
}
/**
 * A Prim plugin used to register itself with Fastify.
 *
 * **Note:** usage of the multipart plugin is optional and can be excluded if support
 * for file uploads is not needed.
 *
 * If you would like to register Prim with Fastify yourself, try importing `fastifyPrimRpc` instead.
 */
export const createMethodHandler = (options: MethodFastifyOptions): PrimServerMethodHandler => {
	const { fastify } = options
	return prim => {
		void fastify.register(fastifyPrimRpc, { ...options, prim })
	}
}

// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { PrimServerMethodHandler, PrimServerEvents, BlobRecords } from "@doseofted/prim-rpc"
import type { FastifyPluginAsync, FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from "fastify"
import type FastifyMultipartPlugin from "@fastify/multipart"
import { File as FileNode, Buffer } from "node:buffer" // unlike other servers, Fastify only works with Node so we can import this safely
import type FormData from "form-data"
/** The default Prim context when used with Fastify. Overridden with `contextTransform` option. */
export type PrimFastifyContext = { context: "fastify"; request: FastifyRequest; reply: FastifyReply }

interface SharedFastifyOptions {
	multipartPlugin?: typeof FastifyMultipartPlugin
	formDataObject?: typeof FormData
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
export const fastifyPrimRpc: FastifyPluginAsync<PrimFastifyPluginOptions> = async (fastify, options) => {
	const {
		prim,
		multipartPlugin,
		formDataObject: FormData,
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
			const blobs: BlobRecords = {}
			let bodyForm: string
			if (multipartPlugin && request.isMultipart()) {
				const parts = request.parts({
					limits: { fileSize },
				})
				for await (const part of parts) {
					if (!("file" in part) && part.fieldname === "rpc") {
						bodyForm = part.value as string
					} else if ("file" in part && part.fieldname.startsWith("_bin_")) {
						const fileBuffer = await new Promise<Buffer[]>(resolve => {
							const chunks: Buffer[] = []
							part.file.on("data", data => chunks.push(data as Buffer))
							part.file.on("error", () => resolve([]))
							part.file.on("end", () => resolve(chunks))
						})
						if (fileBuffer.length > 0) {
							const file = new FileNode(fileBuffer, part.filename, { type: part.mimetype })
							blobs[part.fieldname] = file as unknown as File // it may be node:buffer.File, but BlobRecords expects native File
						}
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
			const response = await prim.server().call({ method, url, body, blobs }, context)
			const blobEntries = Object.entries(response.blobs)
			// FIXME: if only a single file is given, the file itself should be returned (not FormData)
			if (blobEntries.length > 0 && FormData) {
				const formResponse = new FormData()
				formResponse.append("rpc", response.body)
				for (const [blobKey, blobValue] of blobEntries) {
					const asBuffer = blobValue instanceof Blob ? blobValue.arrayBuffer() : blobValue
					formResponse.append(
						blobKey,
						Buffer.from(await asBuffer),
						blobValue instanceof FileNode ? blobValue.name : undefined
					)
				}
				if ("getBuffer" in formResponse) {
					void reply
						.status(response.status)
						.headers({ ...response.headers, ...formResponse.getHeaders() })
						.send(formResponse.getBuffer())
				}
				return
			}
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
			const response = await prim.server().call({ method, url, body }, context)
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

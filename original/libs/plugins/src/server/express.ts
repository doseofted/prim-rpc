// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { PrimServerMethodHandler, PrimServerEvents, BlobRecords } from "@doseofted/prim-rpc"
import type * as Express from "express"
import type formidableType from "formidable"
import type FormData from "form-data"
import { Writable } from "node:stream"
import { AppendOptions } from "form-data"
import { type FileForEnvType, useFileForEnv } from "../utils/isomorphic"

/** The default Prim context when used with Express. Overridden with `contextTransform` option. */
export type PrimExpressContext = { context: "express"; req: Express.Request; res: Express.Response }

interface SharedExpressOptions {
	formDataHandler?: typeof FormData
	multipartPlugin?: typeof formidableType
	fileSizeLimitBytes?: number
	contextTransform?: (req: Express.Request, res: Express.Response) => unknown
}

interface PrimExpressPluginOptions extends SharedExpressOptions {
	prim: PrimServerEvents
}

let FileForEnv: FileForEnvType

/**
 * An Express plugin used to register Prim with the server.
 *
 * **Note:** usage of the multipart plugin is optional and can be excluded if support
 * for file uploads is not needed.
 *
 * To let Prim handle registration with Express, try importing `methodHandler` instead.
 */
export const expressPrimRpc = (options: PrimExpressPluginOptions) => {
	const {
		prim,
		multipartPlugin,
		formDataHandler: MyFormData,
		fileSizeLimitBytes,
		contextTransform = (_req, _res) => undefined,
	} = options
	const { jsonHandler } = prim.options
	const handler = async (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
		FileForEnv ??= await useFileForEnv()
		try {
			if (!req.path.startsWith(prim.options.prefix)) {
				next()
				return
			}
			const { method, originalUrl: url } = req
			let bodyForm: string | Buffer, bodyChunked: string
			const blobs: BlobRecords = {}
			// TODO: test integration with Multer
			if (req.headers["content-type"]?.startsWith("multipart/form-data") && method === "POST") {
				const filesContent: Record<string, Buffer> = {}
				const formHandler = multipartPlugin({
					maxFileSize: fileSizeLimitBytes,
					fileWriteStreamHandler: givenFile => {
						const chunks: Buffer[] = []
						const writable = new Writable({
							write(chunk, enc, next) {
								// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
								chunks.push(chunk)
								next()
							},
							// destroy() {
							// 	filesContent = {}
							// },
							final(cb) {
								const buffer = Buffer.concat(chunks)
								// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
								filesContent[(givenFile as any).newFilename] = buffer
								cb()
							},
						})
						return writable
					},
				})
				await new Promise<void>(resolve => {
					formHandler.parse(req, (err, fields, files) => {
						for (const [fieldname, value] of Object.entries(fields)) {
							if (fieldname === "rpc") {
								bodyForm = value[0]
							}
						}
						for (const [fieldname, value] of Object.entries(files)) {
							if (fieldname === "rpc") {
								const binaryRpc = value[0]
								const fileContent = filesContent[binaryRpc.newFilename]
								bodyForm = fileContent
							} else {
								const resolvedFiles = value.map(file => filesContent[file.newFilename])
								const givenValue = value[0]
								const given = resolvedFiles[0]
								const file = givenValue.originalFilename
									? new FileForEnv([new Uint8Array(given)], givenValue.originalFilename)
									: new Blob([new Uint8Array(given)])
								blobs[fieldname] = file as File | Blob
							}
						}
						resolve()
					})
				})
			} else {
				// NOTE: this middleware should be loaded before body-parser
				bodyChunked = await new Promise<string>(resolve => {
					let body = ""
					req.setEncoding("utf-8")
					req.on("data", chunk => {
						body += chunk
					})
					req.on("end", () => resolve(body))
					// TODO: consider other methods of handling error
					req.on("error", () => resolve(""))
				})
			}
			const body = bodyForm ?? bodyChunked
			const result = await prim.server().call({ method, url, body, blobs }, contextTransform(req, res))
			const hasBinary = ["application/octet-stream", "multipart/form-data"].includes(result.headers["content-type"])
			const blobEntries = Object.entries(result.blobs)
			const suggested = result.headers["content-type"] === "application/octet-stream" ? "file" : "form"
			const fileDetails = { buffer: null as Buffer | null, name: "", type: "application/octet-stream" }
			if (hasBinary && MyFormData) {
				const formResponse = new MyFormData()
				if (jsonHandler.binary) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					formResponse.append("rpc", Buffer.from(result.body))
				} else {
					formResponse.append("rpc", result.body)
				}
				for (const [blobKey, blobValue] of blobEntries) {
					const asBuffer = blobValue instanceof Blob ? await blobValue.arrayBuffer() : blobValue
					const fileBuffer = Buffer.from(asBuffer instanceof ArrayBuffer ? new Uint8Array(asBuffer) : asBuffer)
					const options: AppendOptions = {
						filename: blobValue instanceof Blob ? (blobValue as File)?.name : "",
						contentType: blobValue instanceof Blob ? blobValue.type : "",
					}
					formResponse.append(blobKey, fileBuffer, options)
					if (!fileDetails.buffer) {
						fileDetails.buffer = fileBuffer
						fileDetails.name = options.filename
						fileDetails.type = options.contentType
					}
				}
				if (method === "POST" && "getBuffer" in formResponse && blobEntries.length > 0) {
					res.status(result.status)
					Object.entries(result.headers).forEach(([header, value]) => res.header(header, value))
					Object.entries(formResponse.getHeaders()).forEach(([header, value]) => res.header(header, value as string))
					res.send(formResponse.getBuffer())
					return
				} else if (method === "GET" && suggested === "file" && fileDetails.buffer) {
					res.status(result.status)
					Object.entries({
						...result.headers,
						"content-disposition": `inline; filename="${fileDetails.name}"`,
						"content-type": fileDetails.type ?? result.headers["content-type"],
					}).forEach(([header, value]) => res.header(header, value))
					res.send(fileDetails.buffer)
					return
				}
			}
			res.status(result.status)
			for (const [headerName, headerValue] of Object.entries(result.headers)) {
				res.header(headerName, headerValue)
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			res.send(Buffer.from(result.body))
		} catch (e) {
			const error = e as unknown
			const message: string =
				typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : ""
			res.send({ error: message })
		}
	}
	return handler
}

interface MethodExpressOptions extends SharedExpressOptions {
	app: Express.Application
}
/**
 * A Prim plugin used to register itself with Express.
 *
 * **Note:** usage of the multipart plugin is optional and can be excluded if support
 * for file uploads is not needed.
 *
 * If you would like to register Prim with Express yourself, try importing `expressPrimRpc` instead.
 */
export const createMethodHandler = (options: MethodExpressOptions): PrimServerMethodHandler => {
	const { app } = options
	return prim => {
		app.use(expressPrimRpc({ ...options, prim }))
	}
}

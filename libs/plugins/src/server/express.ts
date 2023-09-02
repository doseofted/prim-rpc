// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { PrimServerMethodHandler, PrimServerEvents, BlobRecords } from "@doseofted/prim-rpc"
import type * as Express from "express"
import type Multer from "multer"

/** The default Prim context when used with Express. Overridden with `contextTransform` option. */
export type PrimExpressContext = { context: "express"; req: Express.Request; res: Express.Response }

interface SharedExpressOptions {
	multipartPlugin?: typeof Multer
	fileSizeLimitBytes?: number
	contextTransform?: (req: Express.Request, res: Express.Response) => unknown
}

interface PrimExpressPluginOptions extends SharedExpressOptions {
	prim: PrimServerEvents
}
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
		fileSizeLimitBytes,
		contextTransform = (req, res) => ({ context: "express", req, res }),
	} = options
	const handler = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
		const processRpc = async (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
			if (!req.path.startsWith(prim.options.prefix)) {
				next()
				return
			}
			const { method, originalUrl: url } = req
			let bodyForm: string, bodyChunked: string
			const blobs: BlobRecords = {}
			// TODO: test integration with Multer
			if (req.files) {
				// NOTE: multer manipulates the body if it's used as well as adding files to a ".files" object
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				bodyForm = req.body.rpc
				for (const [, fileDetails] of Object.entries(req.files)) {
					const given = fileDetails as { buffer: Buffer; originalname: string; mimetype: string; fieldname: string }
					const fieldName = String(given.fieldname)
					if (fieldName.startsWith("_bin_")) {
						const FileObj = typeof File === "undefined" ? (await import("node:buffer")).File : File
						const file = new FileObj([given.buffer], given.originalname, { type: given.mimetype })
						blobs[fieldName] = file as File // it may be node:buffer.File, but BlobRecords expects native File
					}
				}
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
			const context = contextTransform(req, res)
			const response = await prim.server().call({ method, url, body, blobs }, context)
			res.status(response.status)
			for (const [headerName, headerValue] of Object.entries(response.headers)) {
				res.header(headerName, headerValue)
			}
			res.send(response.body)
		}
		if (multipartPlugin) {
			const multipart = multipartPlugin({ limits: { fileSize: fileSizeLimitBytes } }).any()
			multipart(req, res, () => {
				void processRpc(req, res, next)
			})
		} else {
			void processRpc(req, res, next)
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

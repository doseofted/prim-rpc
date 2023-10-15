// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { BlobRecords, PrimServerEvents, PrimServerMethodHandler } from "@doseofted/prim-rpc"
import type { Hono, Context, MiddlewareHandler } from "hono"

interface SharedHonoOptions {
	contextTransform?: (c: Context) => unknown
}

export type PrimHonoContext = { type: "hono"; ctx: Context }

interface PrimHonoPluginOptions extends SharedHonoOptions {
	prim: PrimServerEvents
}

export function honoPrimRpc(options: PrimHonoPluginOptions) {
	const { prim, contextTransform = _ctx => undefined } = options
	const { jsonHandler } = prim.options
	const middleware: MiddlewareHandler = async (context, next) => {
		const { req } = context
		const { pathname, search } = new URL(req.url)
		const url = pathname + search
		let body: string | ArrayBuffer
		const blobs: BlobRecords = {}
		const method = req.method
		if (!url.startsWith(prim.options.prefix ?? "/")) {
			return next()
		}
		const requestType = req.headers.get("content-type") ?? ""
		if (requestType.startsWith("multipart/form-data")) {
			const formData = await req.formData()
			for (const [key, value] of formData) {
				if (key === "rpc") {
					body = value instanceof Blob && jsonHandler.binary ? await value.arrayBuffer() : value.toString()
				} else if (key.startsWith("_bin_") && value instanceof Blob) {
					blobs[key] = value
				}
			}
		} else if (method === "POST") {
			body = await req.text()
		}
		const server = prim.server()
		const result = await server.call({ body, url, method, blobs }, contextTransform(context))
		const hasBinary = ["application/octet-stream", "multipart/form-data"].includes(result.headers["content-type"])
		let firstFile = { name: "", blob: null as Blob | null, type: "application/octet-stream" }
		const blobEntries = Object.entries(result.blobs)
		if (hasBinary) {
			const formData = new FormData()
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			formData.append("rpc", result.body)
			for (const [key, value] of blobEntries) {
				formData.append(key, value as Blob)
				if (!firstFile.blob) {
					const blob = value as File
					firstFile = { name: blob?.name, blob, type: blob.type }
				}
			}
			if (method === "POST" && blobEntries.length > 0) {
				delete result.headers["content-type"] // NOTE: Response will handle this
				return new Response(formData, {
					headers: result.headers,
					status: result.status,
				})
			} else if (method === "GET" && blobEntries.length === 1) {
				return new Response(firstFile.blob, {
					headers: {
						...result.headers,
						"content-disposition": `inline; filename="${firstFile.name}"`,
						"content-type": firstFile.type,
					},
					status: result.status,
				})
			}
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		return new Response(result.body, {
			headers: result.headers,
			status: result.status,
		})
	}
	return middleware
}

interface MethodHonoOptions extends SharedHonoOptions {
	app: Hono
}

/**
 * A Prim plugin used to register itself with Hono.
 *
 * If you would like to register Prim with Hono yourself, try importing `honoPrimRpc` instead.
 */
export const createMethodHandler = (options: MethodHonoOptions): PrimServerMethodHandler => {
	const { app } = options
	return prim => {
		const prefix = prim.options.prefix ?? "/"
		app.use(prefix.endsWith("/") ? prefix + "*" : prefix + "/*", honoPrimRpc({ ...options, prim }))
	}
}

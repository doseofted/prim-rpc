// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { BlobRecords, PrimServerEvents } from "@doseofted/prim-rpc"
import type { APIRoute, APIContext, Props } from "astro"

interface PrimAstroPluginOptions {
	prim: PrimServerEvents
	contextTransform?: (request: APIContext<Props>) => { context: "astro"; request: Request }
}

export function defineAstroPrimHandler(options: PrimAstroPluginOptions) {
	const { prim, contextTransform = _request => undefined } = options
	const { jsonHandler } = prim.options
	const handler: APIRoute = async ctx => {
		const { request, url: urlFull } = ctx
		let body: string | ArrayBuffer
		const blobs: BlobRecords = {}
		const url = urlFull.pathname + urlFull.search
		if (!url.startsWith(prim.options.prefix)) {
			return
		}
		const requestType = request.headers.get("content-type") ?? ""
		const method = request.method
		if (requestType.startsWith("multipart/form-data")) {
			const formData = await request.formData()
			for (const [key, value] of formData) {
				if (key === "rpc") {
					body = value instanceof Blob && jsonHandler.binary ? await value.arrayBuffer() : value.toString()
				} else if (key.startsWith("_bin_") && value instanceof Blob) {
					blobs[key] = value
				}
			}
		} else if (method === "POST") {
			body = await request.text()
		}
		const result = await prim.server().call({ body, method, url, blobs }, contextTransform(ctx))
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
	return {
		GET: handler,
		POST: handler,
	}
}

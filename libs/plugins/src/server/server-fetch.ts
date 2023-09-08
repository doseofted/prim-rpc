// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { BlobRecords, PrimServerEvents } from "@doseofted/prim-rpc"

interface PrimRequestOptions {
	prim: PrimServerEvents
	contextTransform?: (request: Request) => unknown
}

export function primFetch(options: PrimRequestOptions) {
	const { prim, contextTransform = request => ({ type: "Request", request }) } = options
	const { prefix = "/", jsonHandler } = prim.options
	return async (request: Request) => {
		const { method } = request
		const { pathname, search } = new URL(request.url)
		const url = pathname + search
		let body: string | ArrayBuffer
		const blobs: BlobRecords = {}
		if (!url.startsWith(prefix)) {
			return new Response(null, { status: 404 })
		}
		const requestType = request.headers.get("content-type") ?? ""
		if (requestType.startsWith("multipart/form-data")) {
			const formData = await request.formData()
			for (const [key, value] of formData) {
				if (key === "rpc") {
					const binaryBody = value instanceof Blob && jsonHandler.binary
					body = binaryBody ? await value.arrayBuffer() : value.toString()
				} else if (key.startsWith("_bin_") && value instanceof Blob) {
					blobs[key] = value
				}
			}
		} else if (method === "POST") {
			body = await request.text()
		}
		const server = prim.server()
		const methodCall = { body, url, method, blobs }
		const result = await server.call(methodCall, contextTransform(request))
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
					const blob = value as Blob
					firstFile = { name: blob.name, blob, type: blob.type }
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
}

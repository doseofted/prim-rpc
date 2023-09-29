// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { BlobRecords, PrimServerEvents } from "@doseofted/prim-rpc"

interface PrimRequestOptions {
	prim: PrimServerEvents
	/** Transform a request into an object to be passed to your function's `this` context */
	contextTransform?: (request: Request) => unknown
	/** Process given Request before handing it off to this plugin */
	preprocess?: (request: Request) => Request | Promise<Request | undefined> | void
	/** Process Prim+RPC generated Response before sending it back to your server */
	postprocess?: (response: Response) => Response | Promise<Response | undefined> | void
}

export function primFetch(options: PrimRequestOptions) {
	const { prim, contextTransform = _request => undefined, preprocess = r => r, postprocess = r => r } = options
	const { prefix = "/", jsonHandler } = prim.options
	return async (request: Request) => {
		const { method } = (await preprocess(request)) || request
		const { pathname, search } = new URL(request.url)
		const url = pathname + search
		let body: string | ArrayBuffer
		const blobs: BlobRecords = {}
		if (method === "OPTIONS") {
			// don't response or error on preflight requests
			const response = new Response(null, { status: 204 })
			return (await postprocess(response)) || response
		}
		if (!url.startsWith(prefix)) {
			const response = new Response(null, { status: 404 })
			return (await postprocess(response)) || response
		}
		const requestType = request.headers.get("content-type") ?? ""
		if (requestType.startsWith("multipart/form-data")) {
			const formData = await request.formData()
			for (const [key, value] of formData) {
				// NOTE: if using @whatwg-node/fetch ponyfill, value is blob-like but not Blob so check arrayBuffer as given in
				// https://github.com/ardatan/whatwg-node/blob/23de5ba01229f2a33f322494ef84bfcea665ed25/packages/node-fetch/src/FormData.ts#L141-L143
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
				const isBinary = (value as any)?.arrayBuffer != null || value instanceof Blob
				if (key === "rpc") {
					const binaryBody = isBinary && jsonHandler.binary
					body = binaryBody ? await (value as Blob).arrayBuffer() : value.toString()
				} else if (key.startsWith("_bin_") && isBinary) {
					blobs[key] = value as Blob
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
				const response = new Response(formData, {
					headers: result.headers,
					status: result.status,
				})
				return (await postprocess(response)) || response
			} else if (method === "GET" && blobEntries.length === 1) {
				const response = new Response(firstFile.blob, {
					headers: {
						...result.headers,
						"content-disposition": `inline; filename="${firstFile.name}"`,
						"content-type": firstFile.type,
					},
					status: result.status,
				})
				return (await postprocess(response)) || response
			}
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		const response = new Response(result.body, {
			headers: result.headers,
			status: result.status,
		})
		return (await postprocess(response)) || response
	}
}

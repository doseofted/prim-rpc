// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { BlobRecords, PrimServerEvents } from "@doseofted/prim-rpc"
import { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node"

interface PrimRequestOptions {
	prim: PrimServerEvents
	/** Transform a request into an object to be passed to your function's `this` context */
	contextTransform?: (request: Request, response: ResponseInit & { headers: Headers }) => unknown
	/** Process given Request before handing it off to this plugin */
	preprocess?:
		| ((request: LoaderFunctionArgs) => LoaderFunctionArgs | Promise<LoaderFunctionArgs | undefined> | void)
		| ((request: ActionFunctionArgs) => ActionFunctionArgs | Promise<ActionFunctionArgs | undefined> | void)
	/** Process Prim+RPC generated Response before sending it back to your server */
	postprocess?: (response: Response) => Response | Promise<Response | undefined> | void
}

export function primFetch(options: PrimRequestOptions) {
	const { prim, contextTransform = _request => undefined, preprocess = r => r, postprocess = r => r } = options
	const { prefix = "/", jsonHandler } = prim.options
	const fetchLike = async (args: LoaderFunctionArgs | ActionFunctionArgs) => {
		const givenArgs = (await preprocess(args)) || args
		const { request } = givenArgs
		const { pathname, search } = new URL(request.url)
		const url = pathname + search
		let body: string | ArrayBuffer
		const blobs: BlobRecords = {}
		const { method } = request
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
					body = binaryBody ? await (value as Blob).arrayBuffer() : (value as string).toString()
				} else if (key.startsWith("_bin_") && isBinary) {
					blobs[key] = value as Blob
				}
			}
		} else if (method === "POST") {
			body = await request.text()
		}
		const server = prim.server()
		const methodCall = { body, url, method, blobs }
		const responseInit: ResponseInit & { headers: Headers } = { status: 500, headers: new Headers() } // default response, to be merged with intended response
		const result = await server.call(methodCall, contextTransform(request, responseInit))
		for (const [header, headerValue] of Object.entries(result.headers)) {
			responseInit.headers.set(header, headerValue)
		}
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
				responseInit.headers.delete("content-type") // NOTE: Response will handle this
				console.log(Array.from(Object.entries(result.headers)))
				const response = new Response(formData, {
					...responseInit,
					status: result.status,
				})
				return (await postprocess(response)) || response
			} else if (method === "GET" && blobEntries.length === 1) {
				responseInit.headers.set("content-disposition", `inline; filename="${firstFile.name}"`)
				responseInit.headers.set("content-type", firstFile.type)
				const response = new Response(firstFile.blob, {
					...responseInit,
					status: result.status,
				})
				return (await postprocess(response)) || response
			}
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		const response = new Response(result.body, {
			...responseInit,
			status: result.status,
		})
		return (await postprocess(response)) || response
	}
	return { loader: fetchLike, action: fetchLike }
}

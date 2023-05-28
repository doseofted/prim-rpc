// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { PrimClientMethodPlugin, RpcAnswer } from "@doseofted/prim-rpc"

// TODO: test this plugin

interface MethodFetchOptions {
	headers?: Headers | Record<string, string>
	credentials?: RequestCredentials
}

export const createMethodPlugin = (options: MethodFetchOptions = {}) => {
	const methodPlugin: PrimClientMethodPlugin = async (endpoint, jsonBody, jsonHandler, blobs = {}) => {
		const { headers: headersOverride = {} } = options
		let fetchOptions: RequestInit = {}
		const blobList = Object.entries(blobs)
		if (blobList.length > 0) {
			// send as form data if blobs is given (empty if not configured)
			const data = new FormData()
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			data.append("rpc", jsonHandler.stringify(jsonBody))
			for (const [key, blob] of blobList) {
				data.append(key, blob as Blob)
			}
			fetchOptions = {
				method: "POST",
				headers: { ...headersOverride }, // TODO: ensure this doesn't break form data
				body: data,
			}
		} else {
			// send all RPC requests without blobs as regular JSON
			fetchOptions = {
				method: "POST",
				headers: { "content-type": jsonHandler.mediaType ?? "application/json", ...headersOverride },
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				body: jsonHandler.stringify(jsonBody),
			}
		}
		const result = await fetch(endpoint, {
			...fetchOptions,
			credentials: options.credentials,
		})
		const isBinaryLike = result.headers.get("content-type") === "application/octet-stream"
		return jsonHandler.parse(await (isBinaryLike ? result.blob() : result.text())) as RpcAnswer | RpcAnswer[]
	}
	return methodPlugin
}

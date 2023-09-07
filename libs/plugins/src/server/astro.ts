// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { BlobRecords, PrimServerEvents } from "@doseofted/prim-rpc"
import type { APIRoute, APIContext, Props } from "astro"
import { type FileForEnvType, useFileForEnv } from "../utils/isomorphic"

interface PrimAstroPluginOptions {
	prim: PrimServerEvents
	headers?: Headers | Record<string, string>
	contextTransform?: (request: APIContext<Props>) => { context: "astro"; request: Request }
}

let FileForEnv: FileForEnvType

export function defineAstroPrimHandler(options: PrimAstroPluginOptions) {
	const { prim, headers = {}, contextTransform = request => ({ context: "astro", request }) } = options
	const handler: APIRoute = async ctx => {
		FileForEnv ??= await useFileForEnv()
		const { request, url: urlFull } = ctx
		let body: string
		const blobs: BlobRecords = {}
		const url = urlFull.pathname + urlFull.search
		if (!url.startsWith(prim.options.prefix)) {
			return
		}
		const requestType = request.headers.get("content-type") ?? ""
		const method = request.method
		if (requestType.startsWith("multipart/form-data")) {
			const formData = await request.formData()
			formData.forEach((value, key) => {
				if (key === "rpc") {
					body = value.toString()
				} else if (key.startsWith("_bin_") && value instanceof FileForEnv) {
					blobs[key] = value
				}
			})
		} else if (method === "POST") {
			body = await request.text()
		}
		const result = await prim.server().call({ body, method, url, blobs }, contextTransform(ctx))
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		return new Response(result.body, {
			headers: { ...result.headers, ...headers },
			status: result.status,
		})
	}
	return {
		GET: handler,
		POST: handler,
	}
}

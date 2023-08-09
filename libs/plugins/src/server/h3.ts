// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { PrimServerMethodHandler, PrimServerEvents } from "@doseofted/prim-rpc"
import {
	defineEventHandler,
	readRawBody,
	getMethod,
	setResponseHeaders,
	getHeader,
	setResponseStatus,
	readMultipartFormData,
	App,
	H3Event,
} from "h3"

interface SharedH3Options {
	contextTransform?: (event: H3Event) => { context: "h3"; event: H3Event }
}

interface PrimH3PluginOptions extends SharedH3Options {
	prim: PrimServerEvents
}

export function defineH3PrimHandler(options: PrimH3PluginOptions) {
	const { prim, contextTransform = event => ({ context: "h3", event }) } = options
	let body: string
	const blobs: { [identifier: string]: unknown } = {}
	return defineEventHandler(async event => {
		const givenPath = event.node.req.url
		if (!givenPath.startsWith(prim.options.prefix)) {
			return
		}
		const requestType = getHeader(event, "content-type") ?? ""
		const method = getMethod(event)
		const url = event.node.req.url
		const context = contextTransform(event)
		if (requestType.startsWith("multipart/form-data")) {
			const parts = await readMultipartFormData(event)
			for (const part of parts) {
				if (part.name === "rpc") {
					body = part.data.toString("utf-8")
				} else if (typeof part.filename === "string" && part.name.startsWith("_bin_")) {
					const FileObj = typeof File === "undefined" ? (await import("node:buffer")).File : File
					const file = new FileObj([part.data], part.filename, { type: part.type })
					blobs[part.name] = file
				}
			}
		} else if (method === "POST") {
			body = await readRawBody(event)
		}
		const result = await prim.server().call({ body, method, url }, blobs, context)
		setResponseStatus(event, result.status)
		setResponseHeaders(event, result.headers)
		return result.body
	})
}

interface MethodH3Options extends SharedH3Options {
	app: App
}

export const createMethodHandler = (options: MethodH3Options): PrimServerMethodHandler => {
	const { app } = options
	return prim => {
		app.use(defineH3PrimHandler({ ...options, prim }))
	}
}

// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { PrimServerMethodHandler, PrimServerEvents, BlobRecords } from "@doseofted/prim-rpc"
import type FormData from "form-data"
import { AppendOptions } from "form-data"
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
	getRequestURL,
} from "h3"
import { type FileForEnvType, useFileForEnv } from "../utils/isomorphic"

interface SharedH3Options {
	formDataHandler?: typeof FormData
	contextTransform?: (event: H3Event) => { context: "h3"; event: H3Event }
}

interface PrimH3PluginOptions extends SharedH3Options {
	prim: PrimServerEvents
}

let FileForEnv: FileForEnvType

export function defineH3PrimHandler(options: PrimH3PluginOptions) {
	const { prim, contextTransform = event => ({ context: "h3", event }), formDataHandler: MyFormData } = options
	const { jsonHandler } = prim.options
	return defineEventHandler(async event => {
		FileForEnv ??= await useFileForEnv()
		let body: string | Buffer
		const blobs: BlobRecords = {}
		const givenPath = event.node.req.url
		if (!givenPath.startsWith(prim.options.prefix)) {
			return
		}
		const requestType = getHeader(event, "content-type") ?? ""
		const method = getMethod(event)
		const urlGiven = getRequestURL(event)
		const url = urlGiven.pathname + urlGiven.search
		const context = contextTransform(event)
		if (requestType.startsWith("multipart/form-data")) {
			const parts = await readMultipartFormData(event)
			for (const part of parts) {
				if (part.name === "rpc") {
					body = jsonHandler.binary ? part.data : part.data.toString("utf-8")
				} else if (typeof part.filename === "string" && part.name.startsWith("_bin_")) {
					const file = new FileForEnv([part.data], part.filename, { type: part.type })
					blobs[part.name] = file as File // it may be node:buffer.File, but BlobRecords expects native File
				}
			}
		} else if (method === "POST") {
			body = await readRawBody(event, jsonHandler.binary ? false : "utf-8")
		}
		const result = await prim.server().call({ body, method, url, blobs }, context)
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
				const fileBuffer = Buffer.from(asBuffer)
				const options: AppendOptions = {
					filename: blobValue instanceof FileForEnv ? blobValue.name : "",
					contentType: blobValue instanceof FileForEnv ? blobValue.type : "",
				}
				formResponse.append(blobKey, fileBuffer, options)
				if (!fileDetails.buffer) {
					fileDetails.buffer = fileBuffer
					fileDetails.name = options.filename
					fileDetails.type = options.contentType
				}
			}
			if (method === "POST" && "getBuffer" in formResponse && blobEntries.length > 0) {
				setResponseStatus(event, result.status)
				setResponseHeaders(event, { ...result.headers, ...formResponse.getHeaders() })
				return formResponse.getBuffer()
			} else if (method === "GET" && suggested === "file" && fileDetails.buffer) {
				setResponseStatus(event, result.status)
				setResponseHeaders(event, {
					...result.headers,
					"content-disposition": `inline; filename="${fileDetails.name}"`,
					"content-type": fileDetails.type ?? result.headers["content-type"],
				})
				return fileDetails.buffer
			}
		}
		setResponseStatus(event, result.status)
		setResponseHeaders(event, result.headers)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		return Buffer.from(result.body)
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

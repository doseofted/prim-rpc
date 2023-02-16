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
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join as joinPath } from "node:path"

// eslint-disable-next-line @typescript-eslint/no-empty-interface
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
				} else if (part.filename && part.name.startsWith("_bin_")) {
					const tmpFolder = await mkdtemp(joinPath(tmpdir(), "prim-rpc-"))
					const tmpFile = joinPath(tmpFolder, part.filename)
					await writeFile(tmpFile, part.data)
					blobs[part.name] = tmpFile
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

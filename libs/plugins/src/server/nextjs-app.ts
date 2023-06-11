import type { PrimServerEvents } from "@doseofted/prim-rpc"
import { File } from "node:buffer"
import { pipeline } from "node:stream/promises"
import { createWriteStream } from "node:fs"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join as joinPath } from "node:path"
import { PipelineSource } from "node:stream"

interface SharedNextjsOptions {
	contextTransform?: (request: Request) => { context: "nextjs-app"; request: Request }
}

interface PrimNextjsPluginOptions extends SharedNextjsOptions {
	prim: PrimServerEvents
}

// NOTE: this is currently for the app router, not the api router
// TODO: add support for the api router
// TODO: consider way of sharing both app/api router handler from same file
export function defineNextjsAppHandler(options: PrimNextjsPluginOptions) {
	const { prim, contextTransform = request => ({ context: "nextjs-app", request }) } = options
	async function handler(request: Request) {
		let body: string
		const blobs: { [identifier: string]: unknown } = {}
		const parts = new URL(request.url)
		const url = parts.pathname + parts.search
		if (!url.startsWith(prim.options.prefix)) {
			return
		}
		const requestType = request.headers.get("content-type") ?? ""
		const method = request.method
		const context = contextTransform(request)
		if (requestType.startsWith("multipart/form-data")) {
			const formData = await request.formData()
			const blobsAdded: Promise<void>[] = []
			formData.forEach((value, key) => {
				blobsAdded.push(
					(async () => {
						if (key === "rpc") {
							body = value.toString()
						} else if (key.startsWith("_bin_") && value instanceof File) {
							const tmpFolder = await mkdtemp(joinPath(tmpdir(), "prim-rpc-"))
							const tmpFile = joinPath(tmpFolder, value.name)
							const filenamePromise = pipeline(
								value.stream() as PipelineSource<ReadableStream>,
								createWriteStream(tmpFile)
							)
								.then(() => tmpFile)
								.catch(() => "")
							blobs[key] = filenamePromise
						}
					})()
				)
			})
			await Promise.all(blobsAdded)
		} else if (method === "POST") {
			body = await request.text()
		}
		const result = await prim.server().call({ body, method, url }, blobs, context)
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

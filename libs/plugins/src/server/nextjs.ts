import type { BlobRecords, PrimServerEvents } from "@doseofted/prim-rpc"
// import type { NextApiRequest, NextApiResponse } from "next"

interface SharedNextjsOptions {
	prim: PrimServerEvents
}

interface PrimNextjsAppPluginOptions extends SharedNextjsOptions {
	headers?: Headers | Record<string, string>
	contextTransform?: (request: Request) => { context: "nextjs-app"; request: Request }
}

export function defineNextjsAppPrimHandler(options: PrimNextjsAppPluginOptions) {
	const { prim, headers = {}, contextTransform = request => ({ context: "nextjs-app", request }) } = options
	async function handler(request: Request) {
		let body: string
		const blobs: BlobRecords = {}
		const parts = new URL(request.url)
		const url = parts.pathname + parts.search
		if (!url.startsWith(prim.options.prefix)) {
			return
		}
		const requestType = request.headers.get("content-type") ?? ""
		const method = request.method
		const context = contextTransform(request)
		if (requestType.startsWith("multipart/form-data")) {
			const FileObj = typeof File === "undefined" ? (await import("node:buffer")).File : File
			const formData = await request.formData()
			formData.forEach((value, key) => {
				if (key === "rpc") {
					body = value.toString()
				} else if (key.startsWith("_bin_") && value instanceof FileObj) {
					blobs[key] = value
				}
			})
		} else if (method === "POST") {
			body = await request.text()
		}
		const result = await prim.server().call({ body, method, url, blobs }, context)
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

// interface PrimNextjsPagesPluginOptions extends SharedNextjsOptions {
// 	headers: Headers | Record<string, string>
// 	contextTransform?: (
// 		request: NextApiRequest,
// 		response: NextApiResponse
// 	) => { context: "nextjs-pages"; request: NextApiRequest; response: NextApiResponse }
// }

// export function defineNextjsPagesHandler(options: PrimNextjsPagesPluginOptions) {
// 	const { prim, contextTransform = (request, response) => ({ context: "nextjs-pages", request, response }) } = options
// 	return {
// 		async handler(request: NextApiRequest, response: NextApiResponse) {
// 			let body: string
// 			const blobs: { [identifier: string]: unknown } = {}
// 			const parts = new URL(request.url)
// 			const url = parts.pathname + parts.search
// 			if (!url.startsWith(prim.options.prefix)) {
// 				return
// 			}
// 			const requestType = request.headers["content-type"] ?? ""
// 			const method = request.method
// 			const context = contextTransform(request, response)
// 			if (requestType.startsWith("multipart/form-data")) {
// 				// ...
// 			} else if (method === "POST") {
// 				body = request.body as string
// 			}
// 			const result = await prim.server().call({ body, method, url }, blobs, context)
// 			for (const [key, val] of Object.entries(result.headers)) {
// 				response.setHeader(key, val)
// 			}
// 			response.status(result.status).send(result.body)
// 		},
// 		config: {
// 			api: {
// 				bodyParser: false,
// 			},
// 		},
// 	}
// }

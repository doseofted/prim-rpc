import type { PrimServerEvents } from "@doseofted/prim-rpc"

interface SharedNextjsOptions {
	contextTransform?: (request: Request) => { context: "express"; request: Request }
}

interface PrimNextjsPluginOptions extends SharedNextjsOptions {
	prim: PrimServerEvents
}

// NOTE: this is currently for the app router, not the api router
// TODO: add support for the api router
// TODO: consider way of sharing both app/api router handler from same file
export function createExpressAppRouter(options: PrimNextjsPluginOptions) {
	const { prim, contextTransform } = options
	async function handler(request: Request) {
		let body: string
		const givenPath = new URL(request.url).pathname
		if (!givenPath.startsWith(prim.options.prefix)) {
			return
		}
		const requestType = request.headers.get("content-type") ?? ""
		const method = request.method
		const url = givenPath
		const context = contextTransform(request)
		if (requestType.startsWith("multipart/form-data")) {
			// ...
		} else if (method === "POST") {
			body = await request.text()
		}
		const result = await prim.server().call({ body, method, url }, {}, context)
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

import type { PrimServerMethodHandler, PrimServerEvents } from "@doseofted/prim-rpc"

/**
 * NOTE: replace `__SERVER__` with intended server name. note that `Example` is simply that: an example interface.
 * This example resembles Express only because it's familiar to many people in the JavaScript community.
 *
 * You can use any server framework that you like.
 */
type __SERVER__ = {
	use: (
		middleware: (
			req: ServerExample["req"],
			res: ServerExample["res"],
			next: ServerExample["next"]
		) => Promise<void> | void
	) => void
}
interface ServerExample {
	req: {
		method: string
		url: string
		body: string
	}
	res: {
		status: (code: number) => ServerExample["res"]
		setHeaders: (headers: Record<string, string>) => ServerExample["res"]
		send: (message: string) => ServerExample["res"]
	}
	next: () => void
}

export type Prim__SERVER__Context = { context: "__SERVER__"; req: ServerExample["req"]; res: ServerExample["res"] }

interface Shared__SERVER__Options {
	contextTransform?: (req: ServerExample["req"], res: ServerExample["res"]) => Prim__SERVER__Context
}

interface Prim__SERVER__Options extends Shared__SERVER__Options {
	prim: PrimServerEvents
}

export function define__SERVER__Handler(options: Prim__SERVER__Options) {
	const { prim, contextTransform = (req, res) => ({ context: "__SERVER__", req, res }) } = options
	// NOTE: this is some sort of event handler that your chosen server framework expects (like a middleware/plugin)
	return async (req: ServerExample["req"], res: ServerExample["res"], next: ServerExample["next"]) => {
		if (!new URL(req.url).pathname.startsWith(prim.options.prefix)) {
			return next()
		}
		// NOTE: this example demonstrates a simple request without files (multipart data should be considered in real plugin)
		const { method, url, body } = req
		const context = contextTransform(req, res)
		const { body: response, headers, status } = await prim.server().call({ method, url, body }, {}, context)
		res.setHeaders(headers).status(status).send(response)
	}
}

interface MethodH3Options extends Shared__SERVER__Options {
	app: __SERVER__
}

export const createMethodHandler = (options: MethodH3Options): PrimServerMethodHandler => {
	const { app } = options
	return prim => {
		app.use(define__SERVER__Handler({ ...options, prim }))
	}
}

import type { PrimServerMethodHandler, PrimServerEvents } from "@doseofted/prim-rpc"
import type * as Express from "express"

// TODO: test this plugin

interface PrimExpressPluginOptions { prim: PrimServerEvents }
/**
 * An Express plugin used to register Prim with the server. Use like so:
 * 
 * ```ts
 * import express from "express"
 * import { createPrimServer } from "@doseofted/prim-rpc"
 * import { fastifyPrimPlugin } from "@doseofted/prim-plugins"
 *
 * const app = express()
 * const prim = createPrimServer()
 * express.use(expressPrimPlugin({ prim }))
 * ```
 * 
 * To let Prim handle registration with Fastify, try importing `primFastifyMethod`
 */
// eslint-disable-next-line @typescript-eslint/require-await
export const expressPrimPlugin = (options: PrimExpressPluginOptions) => {
	const { prim } = options
	const handler = async (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
		if (!req.path.startsWith(prim.options.prefix)) { next(); return }
		const { method, originalUrl: url } = req
		// NOTE: this middleware should be loaded before body-parser
		const body = await new Promise<string>(resolve => {
			let body = ""
			req.setEncoding("utf-8")
			req.on("data", (chunk) => { body += chunk })
			req.on("end", () => resolve(body))
			// TODO: consider other methods of handling error
			req.on("error", () => resolve(""))
		})
		const response = await prim.client().call({ method, url, body })
		res.status(response.status)
		for (const [headerName, headerValue] of Object.entries(response.headers)) {
			res.header(headerName, headerValue)
		}
		res.send(response.body)
	}
	return handler
}

interface MethodExpressOptions { app: Express.Application }
/**
 * A Prim plugin used to register itself with Express. Use like so:
 *
 * ```ts
 * import express from "express"
 * import { createPrimServer } from "@doseofted/prim-rpc"
 * import { primMethodExpress } from "@doseofted/prim-plugins"
 *
 * const app = express()
 * const prim = createPrimServer({
 *   methodHandler: primMethodExpress({ app })
 * })
 * ```
 * 
 * If you would like to register Prim with Express yourself, try importing `expressPrimPlugin` instead.
 */
export const primMethodExpress = (options: MethodExpressOptions): PrimServerMethodHandler => {
	const { app } = options
	return prim => {
		void app.use(expressPrimPlugin({ prim }))
	}
}

import type { PrimServerMethodHandler, PrimServerEvents } from "@doseofted/prim-rpc"
import type * as Express from "express"
import type Multer from "multer"
import { tmpdir } from "node:os"
// import { mkdtemp } from "node:fs/promises"
// import { join as joinPath } from "node:path"

interface SharedExpressOptions {
	multipartPlugin?: typeof Multer
	fileSizeLimitBytes?: number
}

interface PrimExpressPluginOptions extends SharedExpressOptions {
	prim: PrimServerEvents
}
/**
 * An Express plugin used to register Prim with the server. Use like so:
 *
 * ```ts
 * // imports
 * import express from "express"
 * import multipartPlugin from "multer"
 * import { createPrimServer } from "@doseofted/prim-rpc"
 * import { expressPrimPlugin } from "@doseofted/prim-rpc-plugins/dist/server/express.mjs"
 * // usage
 * const app = express()
 * const prim = createPrimServer()
 * express.use(expressPrimPlugin({ prim, multipartPlugin }))
 * app.listen(3000)
 * ```
 *
 * **Note:** usage of the multipart plugin is optional and can be excluded if support
 * for file uploads is not needed.
 *
 * To let Prim handle registration with Express, try importing `primMethodExpress`
 */
// eslint-disable-next-line @typescript-eslint/require-await
export const expressPrimPlugin = (options: PrimExpressPluginOptions) => {
	const { prim, multipartPlugin, fileSizeLimitBytes } = options
	const handler = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
		const processRpc = async () => {
			if (!req.path.startsWith(prim.options.prefix)) {
				next()
				return
			}
			const { method, originalUrl: url } = req
			let bodyForm: string, bodyChunked: string
			const blobs: { [identifier: string]: unknown } = {}
			// TODO: test integration with Multer
			if (req.files) {
				// NOTE: multer manipulates the body if it's used as well as adding files to a ".files" object
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				bodyForm = req.body.rpc
				for (const [fieldName, file] of Object.entries(req.files)) {
					if (fieldName.startsWith("_bin_")) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						blobs[fieldName] = file.path
					}
				}
			} else {
				// NOTE: this middleware should be loaded before body-parser
				bodyChunked = await new Promise<string>(resolve => {
					let body = ""
					req.setEncoding("utf-8")
					req.on("data", chunk => {
						body += chunk
					})
					req.on("end", () => resolve(body))
					// TODO: consider other methods of handling error
					req.on("error", () => resolve(""))
				})
			}
			const body = bodyForm ?? bodyChunked
			const response = await prim.server().call({ method, url, body }, blobs)
			res.status(response.status)
			for (const [headerName, headerValue] of Object.entries(response.headers)) {
				res.header(headerName, headerValue)
			}
			res.send(response.body)
		}
		if (multipartPlugin) {
			// const tmpFolder = await mkdtemp(joinPath(tmpdir(), "prim-rpc-"))
			multipartPlugin({ limits: { fileSize: fileSizeLimitBytes }, dest: tmpdir() })
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				.any()(req, res, processRpc)
		} else {
			void processRpc()
		}
	}
	return handler
}

interface MethodExpressOptions extends SharedExpressOptions {
	app: Express.Application
}
/**
 * A Prim plugin used to register itself with Express. Use like so:
 *
 * ```ts
 * // imports
 * import express from "express"
 * import multipartPlugin from "multer"
 * import { createPrimServer } from "@doseofted/prim-rpc"
 * import { primMethodExpress } from "@doseofted/prim-rpc-plugins/dist/server/express.mjs"
 * // usage
 * const app = express()
 * const prim = createPrimServer({
 *   methodHandler: primMethodExpress({ app, multipartPlugin })
 * })
 * app.listen(3000)
 * ```
 *
 * **Note:** usage of the multipart plugin is optional and can be excluded if support
 * for file uploads is not needed.
 *
 * If you would like to register Prim with Express yourself, try importing `expressPrimPlugin` instead.
 */
export const primMethodExpress = (options: MethodExpressOptions): PrimServerMethodHandler => {
	const { app } = options
	return prim => {
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		void app.use(expressPrimPlugin({ ...options, prim }))
	}
}

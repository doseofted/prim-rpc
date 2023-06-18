// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { PrimServerEvents, PrimServerMethodHandler } from "@doseofted/prim-rpc"
import type { Hono, Context, MiddlewareHandler } from "hono"

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SharedHonoOptions {
	// ...
}

export type PrimHonoContext = { type: "hono"; ctx: Context }

interface PrimHonoPluginOptions extends SharedHonoOptions {
	prim: PrimServerEvents
	contextTransform?: (c: Context) => unknown
}

export function honoPrimRpc(options: PrimHonoPluginOptions) {
	const { prim, contextTransform = ctx => ({ context: "hono", ctx }) } = options
	const middleware: MiddlewareHandler = async (context, next) => {
		const { req } = context
		const { pathname, search } = new URL(req.url)
		const url = pathname + search
		let body: string
		const blobs: Record<string, unknown> = {}
		const method = req.method
		if (!url.startsWith(prim.options.prefix ?? "/")) {
			return next()
		}
		const requestType = req.headers.get("content-type") ?? ""
		if (requestType.startsWith("multipart/form-data")) {
			const formData = await req.formData()
			formData.forEach((value, key) => {
				if (key === "rpc") {
					body = value.toString()
				} else if (key.startsWith("_bin_") && value instanceof Blob) {
					blobs[key] = value
				}
			})
		} else if (method === "POST") {
			body = await req.text()
		}
		const server = prim.server()
		const response = await server.call({ body, url, method }, blobs, contextTransform(context))
		return new Response(response.body, {
			headers: response.headers,
			status: response.status,
		})
	}
	return middleware
}

interface MethodHonoOptions extends SharedHonoOptions {
	app: Hono
}

/**
 * A Prim plugin used to register itself with Hono.
 *
 * If you would like to register Prim with Hono yourself, try importing `honoPrimRpc` instead.
 */
export const createMethodHandler = (options: MethodHonoOptions): PrimServerMethodHandler => {
	const { app } = options
	return prim => {
		const prefix = prim.options.prefix ?? "/"
		app.use(prefix.endsWith("/") ? prefix + "*" : prefix + "/*", honoPrimRpc({ ...options, prim }))
	}
}

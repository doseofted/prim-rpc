// @ts-check
import path from "node:path"
import { fileURLToPath } from "node:url"
import { readFileSync } from "node:fs"
import Fastify from "fastify"
import middie from "@fastify/middie"

const isTest = process.env.NODE_ENV === "test" || !!process.env.VITE_TEST_BUILD
const isProd = process.env.NODE_ENV === "production"

/** @type {(path: string) => string} */
function relativeToProject (relativePath) {
	const projectDirectory = path.dirname(fileURLToPath(import.meta.url))
	return path.resolve(projectDirectory, relativePath)
}

export async function createServer() {
	const htmlProductionLocation = relativeToProject("dist/client/index.html")
	const htmlProductionUse = isProd ? readFileSync(htmlProductionLocation, "utf-8") : ""
	const { default: ssrManifest } = isProd ? (await import("./dist/client/ssr-manifest.json")) : {}
	const app = Fastify()
	await app.register(middie)
	/** @type {import('vite').ViteDevServer|null} */ let vite = null
	if (!isProd) {
		const { default: viteImport } = await import("vite")
		vite = await viteImport.createServer({
			root: process.cwd(),
			logLevel: isTest ? "error" : "info",
			server: {
				middlewareMode: true,
				watch: {
					usePolling: true,
					interval: 100,
				},
			},
		})
		app.use(vite.middlewares)
	} else {
		const { default: serveStatic } = await import("serve-static")
		app.use("/", serveStatic(relativeToProject("dist/client"), { index: false }))
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	app.get("/", async (request, reply) => {
		try {
			const url = request.url
			let template, render
			if (!isProd) {
				template = readFileSync(relativeToProject("index.html"), "utf-8")
				template = await vite?.transformIndexHtml(url, template)
				render = (await vite?.ssrLoadModule("/src/entry.server.ts"))?.render
			} else {
				template = htmlProductionUse
				render = (await import("./dist/server/entry.server.js"))?.render
			}
			const appHtml = await render(url, ssrManifest)
			const html = template?.replace("<!--ssr-outlet-->", appHtml)
			reply.header("Content-Type", "text/html")
			reply.status(200)
			reply.send(html)
		} catch (e) {
			vite && vite.ssrFixStacktrace(e)
			console.log(e.stack)
			reply.status(500)
			reply.send(e.stack)
		}
	})

	return { app, vite }
}

if (!isTest) {
	const { app } = await createServer()
	app.listen({ port: 6173, host: "0.0.0.0" })
}

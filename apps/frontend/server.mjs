
import path from "node:path"
import { fileURLToPath } from "node:url"
import { readFileSync } from "node:fs"
import { createApp, createRouter } from "h3"
import { listen } from "listhen"

const isTest = process.env.NODE_ENV === "test" || !!process.env.VITE_TEST_BUILD
const isProd = process.env.NODE_ENV === "production"
const root = process.cwd()

export async function createServer() {
	const dirname = path.dirname(fileURLToPath(import.meta.url))
	const resolvePath = p => path.resolve(dirname, p)
	const indexProd = isProd
		? readFileSync(resolvePath("dist/client/index.html"), "utf-8")
		: ""
	const { default: manifest } = isProd ? (await import("./dist/client/ssr-manifest.json")) : {}
	const app = createApp()
	/** @type {import('vite').ViteDevServer} */
	let vite
	if (!isProd) {
		const { default: viteImport } = await import("vite")
		vite = await viteImport.createServer({
			root,
			logLevel: isTest ? "error" : "info",
			server: {
				middlewareMode: true,
				watch: {
					usePolling: true,
					interval: 100,
				},
			},
			appType: "custom",
		})
		app.use(vite.middlewares)
	} else {
		const { default: serveStatic } = await import("serve-static")
		app.use("/", serveStatic(resolvePath("dist/client"), { index: false }))
	}

	const router = createRouter()
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	router.get("/", async (req, res, next) => {
		try {
			const url = req.originalUrl
			let template, render
			if (!isProd) {
				template = readFileSync(resolvePath("index.html"), "utf-8")
				template = await vite.transformIndexHtml(url, template)
				render = (await vite.ssrLoadModule("/src/entry.server.ts")).render
			} else {
				template = indexProd
				render = (await import("./dist/server/entry.server.js")).render
			}
			const [appHtml, preloadLinks] = await render(url, manifest)
			const html = template
				.replace("<!--preload-links-->", preloadLinks)
				.replace("<!--ssr-outlet-->", appHtml)
			res.setHeader("Content-Type", "text/html")
			res.statusCode = 200
			res.end(html)
		} catch (e) {
			vite && vite.ssrFixStacktrace(e)
			console.log(e.stack)
			res.statusCode = 500
			res.end(e.stack)
		}
	})
	app.use(router)

	return { app, vite }
}

if (!isTest) {
	const { app } = await createServer()
	listen(app, { port: 6173 })
}

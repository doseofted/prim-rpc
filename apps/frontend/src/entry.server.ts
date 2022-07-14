import { basename, extname } from "node:path"
import { RouteLocationRaw } from "vue-router"
import { renderToString, SSRContext } from "vue/server-renderer"
import { createApp } from "./main"

interface ManifestStructureGuess {
	[id: string]: string[]
}

export async function render(
	url: RouteLocationRaw,
	manifest: ManifestStructureGuess,
): Promise<[html: string, preload: string]> {
	const { app, router } = createApp()
	void router.push(url)
	await router.isReady()
	const ctx: SSRContext & { modules?: Set<string> } = {}
	const html = await renderToString(app, ctx)
	const preloadLinks = renderPreloadLinks(ctx.modules, manifest)
	return [html, preloadLinks]
}

/**
 * Based on Vue example in Vite repo.
 * 
 * LINK https://github.com/vitejs/vite/blob/d12d469dfb8d7466615b085aac0d461ff18a4465/playground/ssr-vue/src/entry-server.js#L26
 */
function renderPreloadLinks(modules?: Set<string>, manifest?: ManifestStructureGuess) {
	const seen = new Set()
	if (!modules) { return "" }
	const modulesList = Array.from(modules)
	const links = modulesList
		.flatMap((id) => {
			const files = manifest?.[id]
			if (!Array.isArray(files)) { return [] }
			return files
		}).flatMap((file) => {
			const links: string[] = []
			if (seen.has(file)) { return [] }
			seen.add(file)
			const filename = basename(file)
			const depFiles = manifest?.[filename]
			if (!depFiles) { return [] }
			for (const depFile of depFiles) {
				links.push(renderPreloadLink(depFile))
				seen.add(depFile)
			}
			links.push(renderPreloadLink(file))
			return links
		})
		.join("")
	return links
}

type LinkAttrs = "crossorigin"|"href"|"media"|"referrerpolicy"|"rel"|"type"|"as"
const createLinkTag = (props: Partial<Record<LinkAttrs, string|true>>) =>
	`<link ${Object.entries(props)
		.map(([attr, val]) => val === true ? [attr] : [attr, val])
		.map(p => p.join("="))
		.join(" ")}>`
function renderPreloadLink (href: string) {
	const extension = extname(href).replace(".", "")
	const mappedType = (given: string) => ({
		jpg: "jpeg",
	}[given] ?? given)
	const rel = "preload"
	switch (extension) {
		case "js":
			return createLinkTag({ href, rel: "modulepreload", crossorigin: true })
		case "css":
			return createLinkTag({ href, rel: "stylesheet" })
		case "woff":
		case "woff2":
			return createLinkTag({ href, rel, as: "font", type: `font/${mappedType(extension)}`, crossorigin: true })
		case "gif":
		case "png":
		case "jpeg":
		case "jpg:":
			return createLinkTag({ href, rel, as: "image", type: `image/${mappedType(extension)}`})
		default:
			return ""
	}
}

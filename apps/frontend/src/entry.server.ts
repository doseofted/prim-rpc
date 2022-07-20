// import { basename, extname } from "node:path"
import { RouteLocationRaw } from "vue-router"
import { renderToString, SSRContext } from "vue/server-renderer"
import { createApp } from "./main"

interface ManifestStructureGuess {
	[id: string]: string[]
}

export async function render(
	url: RouteLocationRaw,
	_manifest: ManifestStructureGuess,
): Promise<string> {
	const { app, router } = createApp()
	void router.push(url)
	await router.isReady()
	const ctx: SSRContext & { modules?: Set<string> } = {}
	const html = await renderToString(app, ctx)
	return html
}
